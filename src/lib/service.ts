import { CurrentPage, LinkOpportunity } from "./types";
import { SitecoreContentService } from "./sitecore/SitecoreContentService";
import { LinkRecommendationAgent } from "./agent";

export class LinkAnalysisService {
  constructor(private readonly contentService: SitecoreContentService) {}

  async analyze(currentPage: CurrentPage): Promise<LinkOpportunity[]> {
    const startedAt = Date.now();

    console.info("[LinkWise][Service] Starting analysis", {
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
    });

    const plainTextContent = await this.contentService.getPagePlainText(
      currentPage.id,
      currentPage.language,
    );

    if (!plainTextContent) {
      console.warn("[LinkWise][Service] No page content found", { pageId: currentPage.id });
      return [];
    }

    const agent = new LinkRecommendationAgent();
    const { relevantPages, opportunities } = await agent.run({
      ...currentPage,
      plainTextContent,
    });

    console.info("[LinkWise][Service] Agent completed", {
      relevantPages: relevantPages.length,
      opportunities: opportunities.length,
    });

    // Validate destinations exist in retrieved pages
    const pagesById = new Map(relevantPages.map((p) => [p.id, p]));

    const validOpportunities = opportunities.flatMap((opp) => {
      const dest = pagesById.get(opp.destination.id);
      if (!dest) return [];
      return [{ ...opp, destination: { id: dest.id, title: dest.title, path: dest.path } }];
    });

    // Validate source text is linkable (skip failures gracefully)
    const linkable = await Promise.all(
      validOpportunities.map(async (opp) => {
        try {
          const canInsert = await this.contentService.isSourceTextLinkable(
            { ...currentPage, plainTextContent },
            opp.sourceText,
          );
          return { opp, canInsert };
        } catch (error) {
          console.warn("[LinkWise][Service] Linkable check failed, skipping", {
            sourceText: opp.sourceText.slice(0, 60),
            error: error instanceof Error ? error.message : "Unknown",
          });
          return { opp, canInsert: false };
        }
      }),
    );

    const final = linkable.filter(({ canInsert }) => canInsert).map(({ opp }) => opp);

    console.info("[LinkWise][Service] Analysis completed", {
      recommendations: final.length,
      durationMs: Date.now() - startedAt,
    });

    return final;
  }

  async approveLink(currentPage: CurrentPage, opportunity: LinkOpportunity): Promise<void> {
    console.info("[LinkWise][Service] Approving link", {
      pageId: currentPage.id,
      destinationId: opportunity.destination.id,
    });

    await this.contentService.insertApprovedLink(currentPage, opportunity);
  }
}

export function createLinkAnalysisService(): LinkAnalysisService {
  return new LinkAnalysisService(new SitecoreContentService());
}
