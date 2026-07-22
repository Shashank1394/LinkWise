import { CandidatePage, CurrentPage, LinkOpportunity } from "./types";

import { AiProvider } from "../ai/provider";

export class LinkAnalysisService {
  constructor(private readonly aiProvider: AiProvider) {}

  async analyze(
    currentPage: CurrentPage,
    candidatePages: CandidatePage[],
  ): Promise<LinkOpportunity[]> {
    if (!currentPage.plainTextContent?.trim()) {
      return [];
    }

    if (candidatePages.length === 0) {
      return [];
    }

    return this.aiProvider.generateLinkOpportunities({
      currentPage,
      candidatePages,
    });
  }
}
