import { RelevantPageProvider } from "../../lib/recommendations/RelevantPageProvider";
import { RelevantPage, CurrentPage } from "../recommendations/types";
import { SitecoreContentService } from "./SitecoreContentService";

const MAX_SEARCH_TERMS = 20;
const MAX_RELEVANT_PAGES = 100;
const MIN_SEARCH_RESULTS = 8;

export class SitecoreRelevantPageProvider implements RelevantPageProvider {
  constructor(private readonly contentService = new SitecoreContentService()) {}

  async getRelevantPages(
    currentPage: CurrentPage,
    searchQueries: string[],
  ): Promise<RelevantPage[]> {
    console.info("[LinkWise][RelevantPageProvider] Starting retrieval", {
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
      searchQueries,
    });

    const startedAt = Date.now();

    const searchTerms = expandSearchQueries(searchQueries);

    console.info("[LinkWise][RelevantPageProvider] Expanded search queries", {
      original: searchQueries.length,
      expanded: searchTerms.length,
    });

    const searchResults = await Promise.allSettled(
      searchTerms.map((query) =>
        this.contentService.searchCandidatePages(currentPage.siteName, query),
      ),
    );

    const failedSearches = searchResults.filter(
      (result) => result.status === "rejected",
    );

    if (failedSearches.length > 0) {
      console.warn("[LinkWise][RelevantPageProvider] Some searches failed", {
        failed: failedSearches.length,
        total: searchResults.length,
      });
    }

    const allResults = searchResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    console.info("[LinkWise][RelevantPageProvider] Search completed", {
      results: allResults.length,
    });

    const unique = new Map<string, RelevantPage>();

    for (const page of allResults) {
      if (page.id !== currentPage.id && page.path !== currentPage.path) {
        unique.set(page.id, page);
      }
    }

    console.info("[LinkWise][RelevantPageProvider] Unique pages", {
      count: unique.size,
    });

    if (unique.size < MIN_SEARCH_RESULTS) {
      console.info(
        "[LinkWise][RelevantPageProvider] Falling back to content tree",
      );

      const treePages = await this.contentService.getContentTreeCandidates(
        currentPage.siteName,
        currentPage.language,
      );

      for (const page of treePages) {
        if (page.id !== currentPage.id && page.path !== currentPage.path) {
          unique.set(page.id, page);
        }
      }

      console.info(
        "[LinkWise][RelevantPageProvider] Tree enrichment completed",
        {
          totalPages: unique.size,
        },
      );
    }

    const relevantPages = [...unique.values()].slice(0, MAX_RELEVANT_PAGES);

    console.info("[LinkWise][RelevantPageProvider] Retrieval completed", {
      returned: relevantPages.length,
      durationMs: Date.now() - startedAt,
    });

    return relevantPages;
  }
}

function expandSearchQueries(queries: string[]): string[] {
  const terms = queries.flatMap((query) => [
    query,
    ...query.split(/\s+/).filter((term) => term.length >= 4),
  ]);

  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))].slice(
    0,
    MAX_SEARCH_TERMS,
  );
}
