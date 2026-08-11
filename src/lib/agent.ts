import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { createToolRegistry, toOpenAiTool, ToolRegistry, ToolContext } from "./tools";
import { RelevantPage, CurrentPage, LinkOpportunity } from "./types";

const MAX_ITERATIONS = 6;

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
  timeout: 60_000,
  maxRetries: 2,
});

const systemPrompt = `You are LinkWise, an internal-linking agent for Sitecore CMS.

Your goal: analyze the current page and recommend internal links to other pages on the same site.

You have access to these tools:
- find_relevant_pages: Search for pages that might be good link destinations. Call this first with queries based on the page's topics.
- get_page_content: Read the full content of specific pages to understand if they're good link targets.
- submit_link_recommendations: Submit your final link recommendations. Call this when you're done analyzing.

Workflow:
1. Read the current page content provided below.
2. Call find_relevant_pages with search queries that cover the page's key topics.
3. Optionally call get_page_content to read promising pages in detail.
4. Call submit_link_recommendations with your final recommendations.

Rules:
- sourceText must be an exact contiguous phrase from the current page content.
- anchorText must equal sourceText.
- Do not use generic anchors like "here", "click here", "read more".
- Do not recommend linking to the current page itself.
- Do not invent page IDs, titles, or paths — only use what the tools return.
- Submit at most 8 recommendations, or an empty array if none are suitable.`;

export interface AgentResult {
  runId: string;
  relevantPages: RelevantPage[];
  opportunities: LinkOpportunity[];
}

export class LinkRecommendationAgent {
  constructor(private readonly toolRegistry: ToolRegistry = createToolRegistry()) {}

  async run(currentPage: CurrentPage): Promise<AgentResult> {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const allResults: unknown[] = [];

    console.info("[LinkWise][Agent] Run started", {
      runId,
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
    });

    // Build tool definitions dynamically from registry
    const tools = this.toolRegistry
      .getAll()
      .filter((t) => t.parameters)
      .map(toOpenAiTool);

    console.info("[LinkWise][Agent] Tools offered to LLM", {
      runId,
      tools: tools.map((t) => (t as any).function.name),
    });

    // Context passed to every tool's buildInput
    const context: ToolContext = { currentPage };

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          currentPage: {
            id: currentPage.id,
            title: currentPage.title,
            path: currentPage.path,
            language: currentPage.language,
            siteName: currentPage.siteName,
            content: currentPage.plainTextContent ?? "",
          },
        }),
      },
    ];

    let terminalResult: unknown = null;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      console.info("[LinkWise][Agent] Iteration", { runId, iteration, messages: messages.length });

      const response = await client.chat.completions.create({
        model: getModel(),
        temperature: 0.2,
        messages,
        tools,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      console.info("[LinkWise][Agent] LLM responded", {
        runId,
        iteration,
        finishReason: choice.finish_reason,
        toolCalls: assistantMessage.tool_calls?.length ?? 0,
        usage: response.usage,
      });

      // LLM stopped without calling a tool — end the loop
      if (choice.finish_reason === "stop" || !assistantMessage.tool_calls?.length) {
        console.info("[LinkWise][Agent] LLM finished (no tool call)", { runId, iteration });
        break;
      }

      messages.push(assistantMessage as ChatCompletionMessageParam);

      let shouldBreak = false;

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = (toolCall as any).function.name as string;
        const toolArgs = (toolCall as any).function.arguments as string;

        console.info("[LinkWise][Agent] LLM invoked tool", {
          runId,
          iteration,
          tool: toolName,
          arguments: toolArgs,
        });

        const tool = this.toolRegistry.get(toolName);
        if (!tool) {
          console.warn("[LinkWise][Agent] Unknown tool", { runId, toolName });
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: `Error: unknown tool "${toolName}"` });
          continue;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(toolArgs);
        } catch {
          console.error("[LinkWise][Agent] Bad JSON from LLM", { runId, toolName, toolArgs });
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: "Error: invalid JSON" });
          continue;
        }

        try {
          // Each tool builds its own input from the LLM args + context
          const input = tool.buildInput(parsed, context);
          const result = await tool.execute(input);

          // Log result summary
          const summary = Array.isArray(result)
            ? { items: result.length }
            : { type: typeof result };

          console.info("[LinkWise][Agent] Tool result", {
            runId,
            iteration,
            tool: toolName,
            summary,
          });

          // Collect results for the caller
          allResults.push({ tool: toolName, result });

          // If this is a terminal tool, capture result and stop
          if (tool.isTerminal) {
            terminalResult = result;
            messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true }) });
            shouldBreak = true;
            break;
          }

          // Feed result back to LLM
          const json = JSON.stringify(result);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: json.length > 50_000
              ? JSON.stringify({ truncated: true, count: Array.isArray(result) ? result.length : 1, sample: Array.isArray(result) ? result.slice(0, 10) : result })
              : json,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          console.error("[LinkWise][Agent] Tool error", { runId, tool: toolName, error: msg });
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: msg }) });
        }
      }

      if (shouldBreak) break;
    }

    // Extract opportunities from terminal result
    const opportunities = Array.isArray(terminalResult)
      ? (terminalResult as LinkOpportunity[])
      : [];

    // Collect all RelevantPage results from any tool that returned page arrays
    const relevantPages = allResults.flatMap((entry: any) => {
      if (entry.tool !== "submit_link_recommendations" && Array.isArray(entry.result)) {
        return entry.result.filter((item: any) => item && typeof item.id === "string" && typeof item.path === "string");
      }
      return [];
    }) as RelevantPage[];

    console.info("[LinkWise][Agent] Run completed", {
      runId,
      iterations: iteration,
      pages: relevantPages.length,
      opportunities: opportunities.length,
      durationMs: Date.now() - startedAt,
    });

    return { runId, relevantPages, opportunities };
  }
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free";
}
