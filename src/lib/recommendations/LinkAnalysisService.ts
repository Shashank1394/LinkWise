import { AiProvider } from "../ai/provider";
import { CurrentPage, LinkOpportunity } from "./types";
import { SitecoreContentService } from "../sitecore/SitecoreContentService";
import { LinkRecommendationAgent } from "./LinkRecommendationAgent";

export class LinkAnalysisService {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly contentService: SitecoreContentService,
  ) {}

  async analyze(currentPage: CurrentPage): Promise<LinkOpportunity[]> {
    const startedAt = Date.now();

    console.info("[LinkWise][LinkAnalysis] Starting analysis", {
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
    });

    const plainTextContent = await this.contentService.getPagePlainText(
      currentPage.id,
      currentPage.language,
    );

    if (!plainTextContent) {
      console.warn("[LinkWise][LinkAnalysis] No page content found", {
        pageId: currentPage.id,
      });

      return [];
    }

    const pageToAnalyze = {
      ...currentPage,
      plainTextContent,
    };

    const agent = new LinkRecommendationAgent(this.aiProvider);

    const { candidatePages, opportunities } = await agent.run(pageToAnalyze);

    console.info("[LinkWise][LinkAnalysis] Agent completed", {
      candidatePages: candidatePages.length,
      opportunities: opportunities.length,
    });

    const candidatesById = new Map(
      candidatePages.map((page) => [page.id, page]),
    );

    const approvedOpportunities = opportunities.flatMap((opportunity) => {
      const destination = candidatesById.get(opportunity.destination.id);

      if (!destination) {
        console.warn("[LinkWise][LinkAnalysis] Destination page not found", {
          destinationId: opportunity.destination.id,
        });

        return [];
      }

      return [
        {
          ...opportunity,
          destination: {
            id: destination.id,
            title: destination.title,
            path: destination.path,
          },
        },
      ];
    });

    console.info("[LinkWise][LinkAnalysis] Validating source text", {
      opportunities: approvedOpportunities.length,
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

    const finalRecommendations = linkable
      .filter(({ canInsert }) => canInsert)
      .map(({ opportunity }) => opportunity);

    console.info("[LinkWise][LinkAnalysis] Analysis completed", {
      recommendations: finalRecommendations.length,
      durationMs: Date.now() - startedAt,
    });

    return finalRecommendations;
  }

  async approveLink(
    currentPage: CurrentPage,
    opportunity: LinkOpportunity,
  ): Promise<void> {
    console.info("[LinkWise][LinkAnalysis] Approving link", {
      pageId: currentPage.id,
      destinationId: opportunity.destination.id,
      anchorText: opportunity.anchorText,
    });

    const startedAt = Date.now();

    await this.contentService.insertApprovedLink(currentPage, opportunity);

    console.info("[LinkWise][LinkAnalysis] Link approved", {
      durationMs: Date.now() - startedAt,
    });
  }
}
