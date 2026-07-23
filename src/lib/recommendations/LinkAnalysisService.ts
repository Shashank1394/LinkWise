import { AiProvider } from "../ai/provider";
import { CandidatePageProvider } from "./CandidatePageProvider";
import { CurrentPage, LinkOpportunity } from "./types";

export class LinkAnalysisService {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly candidatePageProvider: CandidatePageProvider,
  ) {}

  async analyze(currentPage: CurrentPage): Promise<LinkOpportunity[]> {
    if (!currentPage.plainTextContent?.trim()) {
      return [];
    }

    const candidatePages =
      await this.candidatePageProvider.getCandidates(currentPage);

    console.log("Candidate Pages:", candidatePages);

    if (candidatePages.length === 0) {
      return [];
    }

    return this.aiProvider.generateLinkOpportunities({
      currentPage,
      candidatePages,
    });
  }
}
