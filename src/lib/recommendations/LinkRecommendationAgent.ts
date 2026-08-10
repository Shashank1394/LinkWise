import { AiProvider } from "../ai/provider";
import { createToolRegistry } from "../agent/registerTools";
import { ToolRegistry } from "../agent/ToolRegistry";
import { FindRelevantPagesTool } from "../agent/tools/FindRelevantPagesTool";
import { RelevantPage, CurrentPage, LinkOpportunity } from "./types";

const MAX_RELEVANT_PAGES = 100;
const BATCH_SIZE = 10;
const TARGET_RECOMMENDATIONS = 8;

export class LinkRecommendationAgent {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly toolRegistry: ToolRegistry = createToolRegistry(),
  ) {}

  async run(currentPage: CurrentPage): Promise<AgentRecommendationResult> {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();

    console.info("[LinkWise][Agent] Run started", {
      runId,
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
    });

    // Step 1: Ask LLM to generate search queries based on page content

    console.info("[LinkWise][Agent] Step 1 — Asking LLM to generate search queries", {
      runId,
      inputToLLM: {
        pageTitle: currentPage.title,
        pagePath: currentPage.path,
        contentLength: (currentPage.plainTextContent ?? "").length,
      },
    });

    const searchQueries =
      await this.aiProvider.requestRelevantPageSearch(currentPage);

    console.info("[LinkWise][Agent] Step 1 — LLM returned search queries", {
      runId,
      llmOutput: {
        toolCalled: "search_site_pages",
        queryCount: searchQueries.length,
        queries: searchQueries,
      },
    });

    // Step 2: Execute find_relevant_pages tool with the LLM-generated queries

    const tool =
      this.toolRegistry.get<FindRelevantPagesTool>("find_relevant_pages");

    if (!tool) {
      throw new Error('Tool "find_relevant_pages" is not registered.');
    }

    console.info("[LinkWise][Agent] Step 2 — Executing tool: find_relevant_pages", {
      runId,
      toolInput: {
        pageId: currentPage.id,
        siteName: currentPage.siteName,
        searchQueries,
      },
    });

    const retrievedPages = await tool.execute({
      currentPage,
      searchQueries,
    });

    console.info("[LinkWise][Agent] Step 2 — Tool returned relevant pages", {
      runId,
      toolOutput: {
        pagesReturned: retrievedPages.length,
        pageIds: retrievedPages.slice(0, 20).map((p) => p.id),
      },
    });

    const relevantPages = retrievedPages.slice(0, MAX_RELEVANT_PAGES);

    console.info("[LinkWise][Agent] Relevant page retrieval completed", {
      runId,
      pagesRetrieved: retrievedPages.length,
      pagesProvidedToAgent: relevantPages.length,
    });

    if (relevantPages.length === 0) {
      return {
        runId,
        relevantPages: [],
        opportunities: [],
      };
    }

    // Step 3: Ask LLM to analyze relevant pages in batches and produce link recommendations

    const batches = this.createBatches(relevantPages);

    const recommendations = new Map<string, LinkOpportunity>();
    let processedBatches = 0;

    for (const [index, batch] of batches.entries()) {
      processedBatches++;

      console.info("[LinkWise][Agent] Step 3 — Sending batch to LLM for recommendation", {
        runId,
        batch: index + 1,
        totalBatches: batches.length,
        inputToLLM: {
          currentPageTitle: currentPage.title,
          relevantPageCount: batch.length,
          relevantPageIds: batch.map((p) => p.id),
        },
      });

      const batchRecommendations =
        await this.aiProvider.submitLinkRecommendations({
          currentPage,
          retrievedPages: batch,
        });

      console.info("[LinkWise][Agent] Step 3 — LLM returned recommendations", {
        runId,
        batch: index + 1,
        llmOutput: {
          toolCalled: "submit_link_recommendations",
          recommendationsReturned: batchRecommendations.length,
          recommendations: batchRecommendations.map((r) => ({
            sourceText: r.sourceText.slice(0, 60),
            destinationId: r.destination.id,
            score: r.score,
          })),
        },
      });

      for (const recommendation of batchRecommendations) {
        const key = `${recommendation.sourceText}:${recommendation.destination.id}`;

        recommendations.set(key, recommendation);
      }

      console.info("[LinkWise][Agent] Current recommendation count", {
        runId,
        total: recommendations.size,
      });

      if (recommendations.size >= TARGET_RECOMMENDATIONS) {
        console.info("[LinkWise][Agent] Target reached. Stopping early.", {
          runId,
          target: TARGET_RECOMMENDATIONS,
        });

        break;
      }
    }

    const opportunities = [...recommendations.values()];

    console.info("[LinkWise][Agent] Run completed", {
      runId,
      batchesProcessed: processedBatches,
      recommendations: opportunities.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      runId,
      relevantPages,
      opportunities,
    };
  }

  private createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    return batches;
  }
}

export interface AgentRecommendationResult {
  runId: string;
  relevantPages: RelevantPage[];
  opportunities: LinkOpportunity[];
}
