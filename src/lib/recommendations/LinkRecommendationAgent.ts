import { AiProvider } from "../ai/provider";
import { createToolRegistry } from "../agent/registerTools";
import { ToolRegistry } from "../agent/ToolRegistry";
import { FindRelevantPagesTool } from "../agent/tools/FindRelevantPagesTool";
import { RelevantPage, CurrentPage, LinkOpportunity } from "./types";

const MAX_CANDIDATES = 100;
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

    // Generate search queries

    const searchQueries =
      await this.aiProvider.requestCandidateSearch(currentPage);

    console.info("[LinkWise][Agent] Search plan generated", {
      runId,
      queryCount: searchQueries.length,
      searchQueries,
    });

    // Get the candidate retrieval tool

    const tool =
      this.toolRegistry.get<FindRelevantPagesTool>("find_relevant_pages");

    if (!tool) {
      throw new Error('Tool "find_relevant_pages" is not registered.');
    }

    console.info("[LinkWise][Agent] Executing tool", {
      runId,
      tool: tool.name,
    });

    // Retrieve candidate pages

    const retrievedCandidates = await tool.execute({
      currentPage,
      searchQueries,
    });

    console.info("[LinkWise][Agent] Tool execution completed", {
      runId,
      tool: tool.name,
      candidatesReturned: retrievedCandidates.length,
    });

    const candidatePages = retrievedCandidates.slice(0, MAX_CANDIDATES);

    console.info("[LinkWise][Agent] Candidate retrieval completed", {
      runId,
      candidatesRetrieved: retrievedCandidates.length,
      candidatesProvidedToAgent: candidatePages.length,
    });

    if (candidatePages.length === 0) {
      return {
        runId,
        relevantPages: [],
        opportunities: [],
      };
    }

    // Process candidates in batches

    const batches = this.createBatches(candidatePages);

    const recommendations = new Map<string, LinkOpportunity>();
    let processedBatches = 0;

    for (const [index, batch] of batches.entries()) {
      processedBatches++;
      console.info("[LinkWise][Agent] Processing batch", {
        runId,
        batch: index + 1,
        totalBatches: batches.length,
        candidates: batch.length,
      });

      const batchRecommendations =
        await this.aiProvider.submitLinkRecommendations({
          currentPage,
          retrievedPages: batch,
        });

      console.info("[LinkWise][Agent] Batch completed", {
        runId,
        batch: index + 1,
        recommendations: batchRecommendations.length,
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
      relevantPages: candidatePages,
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
