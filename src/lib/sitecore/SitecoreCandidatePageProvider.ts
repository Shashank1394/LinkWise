import { CandidatePageProvider } from "../../lib/recommendations/CandidatePageProvider";
import { CandidatePage, CurrentPage } from "../../lib/recommendations/types";
import { SitecoreContentService } from "./SitecoreContentService";

export class SitecoreCandidatePageProvider implements CandidatePageProvider {
  constructor(private readonly contentService = new SitecoreContentService()) {}

  async getCandidates(
    currentPage: CurrentPage,
    searchQueries: string[],
  ): Promise<CandidatePage[]> {
    console.info("[LinkWise][CandidateProvider] Starting candidate retrieval", {
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
      searchQueries,
    });

    const startedAt = Date.now();

    const searchTerms = expandSearchQueries(searchQueries);

    console.info("[LinkWise][CandidateProvider] Expanded search queries", {
      original: searchQueries.length,
      expanded: searchTerms.length,
    });

    const searches = await Promise.allSettled(
      searchTerms.map((query) =>
        this.contentService.searchCandidatePages(currentPage.siteName, query),
      ),
    );

    const allResults = searches.flatMap((search) =>
      search.status === "fulfilled" ? search.value : [],
    );

    console.info("[LinkWise][CandidateProvider] Search completed", {
      results: allResults.length,
    });

    const unique = new Map<string, CandidatePage>();

    for (const page of allResults) {
      if (page.id !== currentPage.id && page.path !== currentPage.path) {
        unique.set(page.id, page);
      }
    }

    console.info("[LinkWise][CandidateProvider] Unique search candidates", {
      count: unique.size,
    });

    if (unique.size < 8) {
      console.info(
        "[LinkWise][CandidateProvider] Falling back to content tree",
      );

      const treeCandidates = await this.contentService.getContentTreeCandidates(
        currentPage.siteName,
        currentPage.language,
      );

      for (const page of treeCandidates) {
        if (page.id !== currentPage.id && page.path !== currentPage.path) {
          unique.set(page.id, page);
        }
      }

      console.info("[LinkWise][CandidateProvider] Tree enrichment completed", {
        totalCandidates: unique.size,
      });
    }

    const candidates = [...unique.values()].slice(0, 40);

    console.info(
      "[LinkWise][CandidateProvider] Candidate retrieval completed",
      {
        returned: candidates.length,
        durationMs: Date.now() - startedAt,
      },
    );

    return candidates;
  }
}

function expandSearchQueries(queries: string[]): string[] {
  const terms = queries.flatMap((query) => [
    query,
    ...query.split(/\s+/).filter((term) => term.length >= 4),
  ]);

  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))].slice(
    0,
    20,
  );
}
