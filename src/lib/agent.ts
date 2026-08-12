import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { createToolRegistry, toOpenAiTool, ToolRegistry, ToolContext } from "./tools";
import { RelevantPage, CurrentPage, LinkOpportunity } from "./types";

const MAX_ITERATIONS = 10;
const MAX_RECOMMENDATIONS = 8;

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
  timeout: 60_000,
  maxRetries: 2,
});

const systemPrompt = `You are LinkWise, an internal-linking agent for Sitecore CMS.

Your goal: analyze the current page and find ALL possible internal link opportunities to other pages on the same site. Be thorough and exhaustive.

You have access to these tools:
- find_relevant_pages: Search for pages on the site. Returns pages with id, title, path, and their full content.
- submit_link_recommendations: Submit ALL link opportunities you found.

Workflow:
1. Read the current page content provided below. Identify meaningful multi-word phrases that represent topics or concepts.
2. Call find_relevant_pages with diverse queries covering the main topics on the page.
3. Review the returned pages. If the results don't cover all topics mentioned on the current page, call find_relevant_pages again with different queries targeting the uncovered topics.
4. Once you have explored all relevant topics, call submit_link_recommendations with every valid opportunity.

Rules for sourceText (CRITICAL):
- sourceText must be a meaningful multi-word phrase (minimum 3 words) from the current page content.
- sourceText must be an EXACT contiguous phrase that appears verbatim in the current page text.
- NEVER use single words like "pricing", "valuer", "budget", "insurance".
- NEVER use generic phrases like "click here", "read more", "learn more".
- Good examples: "lenders mortgage insurance", "building and pest inspection", "loan pre-approval", "household budget before purchasing".
- Bad examples: "pricing", "valuer", "renovation", "equity".

Rules for destination pages:
- NEVER link to paths ending in /rich text, /content, /text, or /body — those are field-level items.
- The destination should be an actual page with meaningful content, not a raw data fragment.

Other rules:
- anchorText must equal sourceText.
- Do not recommend linking to the current page itself.
- Do not invent page IDs, titles, or paths — only use what the tools return.
- Do not submit the same destination page more than once.
- Score each opportunity from 0 to 100 based on relevance and SEO value.`;

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
        tool_choice: "required",
      });

      const choice = response.choices?.[0];

      if (!choice || !choice.message) {
        console.error("[LinkWise][Agent] Empty response from LLM", {
          runId,
          iteration,
          choices: response.choices?.length ?? 0,
          raw: JSON.stringify(response).slice(0, 500),
        });
        break;
      }

      const assistantMessage = choice.message;

      console.info("[LinkWise][Agent] LLM responded", {
        runId,
        iteration,
        finishReason: choice.finish_reason,
        toolCalls: assistantMessage.tool_calls?.length ?? 0,
        usage: response.usage,
      });

      // LLM stopped without calling a tool — nudge it to submit
      if (!assistantMessage.tool_calls?.length) {
        console.warn("[LinkWise][Agent] LLM responded without tool call — nudging", { runId, iteration });
        messages.push(assistantMessage as ChatCompletionMessageParam);
        messages.push({
          role: "user",
          content: "You must call submit_link_recommendations now with all the link opportunities you found. If you found none, call it with an empty array.",
        });
        continue;
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

            const submitted = Array.isArray(result) ? result.length : 0;

            console.info("[LinkWise][Agent] Terminal tool called — stopping", {
              runId,
              iteration,
              submitted,
              willKeepTop: MAX_RECOMMENDATIONS,
            });

            messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true, count: submitted }) });
            shouldBreak = true;
            break;
          }

          // Feed result back to LLM — full content, no truncation
          const json = JSON.stringify(result);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: json,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          console.error("[LinkWise][Agent] Tool error", { runId, tool: toolName, error: msg });
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: msg }) });
        }
      }

      if (shouldBreak) break;
    }

    // Extract opportunities from terminal result — sort by score descending, cap at MAX_RECOMMENDATIONS
    const allOpportunities = Array.isArray(terminalResult)
      ? (terminalResult as LinkOpportunity[])
      : [];

    const opportunities = allOpportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECOMMENDATIONS);

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
