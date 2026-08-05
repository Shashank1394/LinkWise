import { AiProvider } from "../ai/provider";
import { CandidatePageProvider } from "./CandidatePageProvider";
import { CurrentPage, LinkOpportunity } from "./types";
import { SitecoreContentService } from "../sitecore/SitecoreContentService";
import { isAllowedDestinationPage } from "../sitecore/pageScope";
import { LinkRecommendationAgent } from "./LinkRecommendationAgent";

export class LinkAnalysisService {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly candidatePageProvider: CandidatePageProvider,
    private readonly contentService: SitecoreContentService,
  ) {}

  async analyze(currentPage: CurrentPage): Promise<LinkOpportunity[]> {
    const plainTextContent = await this.contentService.getPagePlainText(
      currentPage.id,
      currentPage.language,
    );

    if (!plainTextContent) {
      return [];
    }

    const pageToAnalyze = { ...currentPage, plainTextContent };

    const { candidatePages, opportunities } = await new LinkRecommendationAgent(
      this.aiProvider,
      this.candidatePageProvider,
    ).run(pageToAnalyze);
    const candidatesById = new Map(candidatePages.map((page) => [page.id, page]));

    const approvedOpportunities = opportunities.flatMap((opportunity) => {
      const destination = candidatesById.get(opportunity.destination.id);

      if (!destination || !isAllowedDestinationPage(destination)) {
        return [];
      }

      return [{
        ...opportunity,
        destination: {
          id: destination.id,
          title: destination.title,
          path: destination.path,
        },
      }];
    });

    const linkable = await Promise.all(
      approvedOpportunities.map(async (opportunity) => ({
        opportunity,
        canInsert: await this.contentService.isSourceTextLinkable(
          pageToAnalyze,
          opportunity.sourceText,
        ),
      })),
    );

    return linkable
      .filter(({ canInsert }) => canInsert)
      .map(({ opportunity }) => opportunity);
  }

  async approveLink(
    currentPage: CurrentPage,
    opportunity: LinkOpportunity,
  ): Promise<void> {
    await this.contentService.insertApprovedLink(currentPage, opportunity);
  }
}
