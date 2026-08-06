import { AiProvider } from "../ai/provider";
import { createToolRegistry } from "../agent/registerTools";
import { ToolRegistry } from "../agent/ToolRegistry";
import { GetCandidatePagesTool } from "../agent/tools/GetCandidatePagesTool";
import { CandidatePage, CurrentPage, LinkOpportunity } from "./types";

const MAX_CANDIDATES_FOR_RECOMMENDATION = 30;

/**
 * Coordinates the read-only part of link analysis.
 *
 * The agent now performs candidate retrieval through registered tools,
 * making it easy to migrate to full LLM tool-calling later.
 */
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

    // -----------------------------------------------------------------------
    // Step 1 - Ask the AI which topics/pages should be searched
    // -----------------------------------------------------------------------

    const searchQueries =
      await this.aiProvider.requestCandidateSearch(currentPage);

    console.info("[LinkWise][Agent] Search plan generated", {
      runId,
      queryCount: searchQueries.length,
      searchQueries,
    });

    // -----------------------------------------------------------------------
    // Step 2 - Resolve the Candidate Retrieval Tool
    // -----------------------------------------------------------------------

    const tool = this.toolRegistry.get<GetCandidatePagesTool>(
      "get_candidate_pages",
    );

    if (!tool) {
      throw new Error('Tool "get_candidate_pages" is not registered.');
    }

    console.info("[LinkWise][Agent] Executing tool", {
      runId,
      tool: tool.name,
      input: {
        pageId: currentPage.id,
        queryCount: searchQueries.length,
      },
    });

    // -----------------------------------------------------------------------
    // Step 3 - Execute Tool
    // -----------------------------------------------------------------------

    const retrievedCandidates = await tool.execute({
      currentPage,
      searchQueries,
    });

    console.info("[LinkWise][Agent] Tool execution completed", {
      runId,
      tool: tool.name,
      candidatesReturned: retrievedCandidates.length,
    });

    const candidatePages = retrievedCandidates.slice(
      0,
      MAX_CANDIDATES_FOR_RECOMMENDATION,
    );

    console.info("[LinkWise][Agent] Candidate retrieval completed", {
      runId,
      queryCount: searchQueries.length,
      candidatesRetrieved: retrievedCandidates.length,
      candidatesProvidedToAgent: candidatePages.length,
    });

    if (candidatePages.length === 0) {
      console.info("[LinkWise][Agent] No candidate pages found", {
        runId,
      });

      return {
        runId,
        candidatePages,
        opportunities: [],
      };
    }

    // -----------------------------------------------------------------------
    // Step 4 - Ask the AI for link recommendations
    // -----------------------------------------------------------------------

    console.info("[LinkWise][Agent] Generating recommendations", {
      runId,
      candidatePages: candidatePages.length,
    });

    const opportunities = await this.aiProvider.submitLinkRecommendations({
      currentPage,
      candidatePages,
    });

    console.info("[LinkWise][Agent] Recommendations generated", {
      runId,
      recommendations: opportunities.length,
    });

    console.info("[LinkWise][Agent] Run completed", {
      runId,
      durationMs: Date.now() - startedAt,
    });

    return {
      runId,
      candidatePages,
      opportunities,
    };
  }
}

export interface AgentRecommendationResult {
  runId: string;
  candidatePages: CandidatePage[];
  opportunities: LinkOpportunity[];
}
