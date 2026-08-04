import { CandidatePageProvider } from "../../lib/recommendations/CandidatePageProvider";
import { CandidatePage, CurrentPage } from "../../lib/recommendations/types";
import { SitecoreContentService } from "./SitecoreContentService";
import { isAllowedDestinationPage } from "./pageScope";

export class SitecoreCandidatePageProvider implements CandidatePageProvider {
  constructor(private readonly contentService = new SitecoreContentService()) {}

  async getCandidates(
    currentPage: CurrentPage,
    searchQueries: string[],
  ): Promise<CandidatePage[]> {
    const searchTerms = expandSearchQueries(searchQueries);
    const searches = await Promise.allSettled(
      searchTerms.map((query) =>
        this.contentService.searchCandidatePages(currentPage.siteName, query),
      ),
    );
    const allResults = searches.flatMap((search) =>
      search.status === "fulfilled" ? search.value : [],
    );

    const unique = new Map<string, CandidatePage>();

    for (const page of allResults) {
      if (
        page.id !== currentPage.id &&
        page.path !== currentPage.path &&
        isAllowedDestinationPage(page)
      ) {
        unique.set(page.id, page);
      }
    }

    // The Agent API search is lexical. If the AI's concepts do not closely
    // match page titles, enrich the candidate set from the permitted tree.
    if (unique.size < 8) {
      const treeCandidates = await this.contentService.getContentTreeCandidates(
        currentPage.siteName,
        currentPage.language,
      );

      for (const page of treeCandidates) {
        if (page.id !== currentPage.id && isAllowedDestinationPage(page)) {
          unique.set(page.id, page);
        }
      }
    }

    return [...unique.values()].slice(0, 40);
  }
}

function expandSearchQueries(queries: string[]): string[] {
  const terms = queries.flatMap((query) => [
    query,
    ...query.split(/\s+/).filter((term) => term.length >= 4),
  ]);

  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))].slice(0, 20);
}
