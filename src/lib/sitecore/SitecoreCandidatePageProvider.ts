import { CandidatePageProvider } from "../../lib/recommendations/CandidatePageProvider";
import { CandidatePage, CurrentPage } from "../../lib/recommendations/types";
import { SitecoreContentService } from "./SitecoreContentService";
import { isAllowedDestinationPage } from "./pageScope";

export class SitecoreCandidatePageProvider implements CandidatePageProvider {
  constructor(private readonly contentService = new SitecoreContentService()) {}

  async getCandidates(currentPage: CurrentPage): Promise<CandidatePage[]> {
    const searchTerms = this.extractSearchTerms(currentPage);
    const searches = await Promise.allSettled(
      searchTerms.map((term) =>
        this.contentService.searchCandidatePages(currentPage.siteName, term),
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

    return [...unique.values()].slice(0, 20);
  }

  private extractSearchTerms(currentPage: CurrentPage): string[] {
    const titleWords = this.tokenize(currentPage.title);
    const contentWords = this.tokenize(currentPage.plainTextContent ?? "");
    const frequencies = new Map<string, number>();

    for (const word of contentWords) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }

    // Title terms describe the page's subject, so make them more influential.
    for (const word of titleWords) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 3);
    }

    return [...frequencies.entries()]
      .sort(([firstWord, firstCount], [secondWord, secondCount]) => {
        return secondCount - firstCount || secondWord.length - firstWord.length;
      })
      .slice(0, 8)
      .map(([word]) => word);
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "your",
      "this",
      "that",
      "into",
      "from",
      "guide",
      "ultimate",
      "how",
      "what",
      "when",
      "where",
      "why",
      "home",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }
}
