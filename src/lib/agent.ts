import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { createToolRegistry, toOpenAiTool, ToolRegistry } from "./tools";
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
    const collectedPages: RelevantPage[] = [];

    console.info("[LinkWise][Agent] Run started", {
      runId,
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
    });

    const tools = this.toolRegistry
      .getAll()
      .filter((t) => t.parameters)
      .map(toOpenAiTool);

    console.info("[LinkWise][Agent] Tools offered to LLM", {
      runId,
      tools: tools.map((t) => (t as any).function.name),
    });

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

    let opportunities: LinkOpportunity[] = [];
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

      if (choice.finish_reason === "stop" || !assistantMessage.tool_calls?.length) {
        console.info("[LinkWise][Agent] LLM finished (no tool call)", { runId, iteration });
        break;
      }

      messages.push(assistantMessage as ChatCompletionMessageParam);

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
          const input = this.buildInput(toolName, parsed, currentPage);
          const result = await tool.execute(input);

          console.info("[LinkWise][Agent] Tool result", {
            runId,
            iteration,
            tool: toolName,
            summary: this.summarize(toolName, result),
          });

          if (toolName === "submit_link_recommendations") {
            opportunities = result as LinkOpportunity[];
            messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true, count: opportunities.length }) });
            iteration = MAX_ITERATIONS; // exit loop
            break;
          }

          if (toolName === "find_relevant_pages" && Array.isArray(result)) {
            collectedPages.push(...(result as RelevantPage[]));
          }

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
    }

    console.info("[LinkWise][Agent] Run completed", {
      runId,
      iterations: iteration,
      pages: collectedPages.length,
      opportunities: opportunities.length,
      durationMs: Date.now() - startedAt,
    });

    return { runId, relevantPages: collectedPages, opportunities };
  }

  private buildInput(toolName: string, args: Record<string, unknown>, currentPage: CurrentPage): unknown {
    switch (toolName) {
      case "find_relevant_pages":
        return { currentPage, searchQueries: args.queries };
      case "get_page_content":
        return { pageIds: args.pageIds, language: currentPage.language };
      case "submit_link_recommendations":
        return { opportunities: args.opportunities };
      default:
        return args;
    }
  }

  private summarize(toolName: string, result: unknown): Record<string, unknown> {
    if (Array.isArray(result)) {
      if (toolName === "find_relevant_pages") return { pagesFound: result.length };
      if (toolName === "get_page_content") return { pagesRetrieved: result.length };
      if (toolName === "submit_link_recommendations") return { submitted: result.length };
    }
    return { type: typeof result };
  }
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free";
}
