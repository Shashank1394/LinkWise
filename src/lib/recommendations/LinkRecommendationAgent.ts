import { AiProvider } from "../ai/provider";
import { CandidatePageProvider } from "./CandidatePageProvider";
import { CandidatePage, CurrentPage, LinkOpportunity } from "./types";

const MAX_CANDIDATES_FOR_RECOMMENDATION = 30;

/**
 * Coordinates the read-only part of link analysis.
 *
 * This first version deliberately preserves the existing two-call LLM flow:
 * plan retrieval queries, retrieve real Sitecore pages, then recommend links.
 * Later steps will give this coordinator bounded tools instead of calling the
 * provider methods directly.
 */
export class LinkRecommendationAgent {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly candidatePageProvider: CandidatePageProvider,
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
    const searchQueries =
      await this.aiProvider.requestCandidateSearch(currentPage);
    const retrievedCandidates = await this.candidatePageProvider.getCandidates(
      currentPage,
      searchQueries,
    );
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
      return { runId, candidatePages, opportunities: [] };
    }

    const opportunities = await this.aiProvider.submitLinkRecommendations({
      currentPage,
      candidatePages,
    });

    console.info("[LinkWise][Agent] Run completed", {
      runId,
      recommendationsSubmitted: opportunities.length,
      durationMs: Date.now() - startedAt,
    });

    return { runId, candidatePages, opportunities };
  }
}

export interface AgentRecommendationResult {
  runId: string;
  candidatePages: CandidatePage[];
  opportunities: LinkOpportunity[];
}
