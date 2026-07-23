import { CandidatePageProvider } from "../../lib/recommendations/CandidatePageProvider";
import { CandidatePage, CurrentPage } from "../../lib/recommendations/types";
import { SitecoreContentService } from "./SitecoreContentService";

export class SitecoreCandidatePageProvider implements CandidatePageProvider {
  constructor(private readonly contentService = new SitecoreContentService()) {}

  async getCandidates(currentPage: CurrentPage): Promise<CandidatePage[]> {
    const searchTerms = this.extractSearchTerms(currentPage);

    const allResults: CandidatePage[] = [];

    for (const term of searchTerms) {
      const results = await this.contentService.searchCandidatePages(
        currentPage.siteName,
        term,
      );

      allResults.push(...results);
    }

    const unique = new Map<string, CandidatePage>();

    for (const page of allResults) {
      if (page.id !== currentPage.id && page.path !== currentPage.path) {
        unique.set(page.id, page);
      }
    }

    return [...unique.values()].slice(0, 20);
  }

  private extractSearchTerms(currentPage: CurrentPage): string[] {
    const text = `${currentPage.title} ${currentPage.plainTextContent ?? ""}`;

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

    const keywords = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    return [...new Set(keywords)].slice(0, 5);
  }
}
