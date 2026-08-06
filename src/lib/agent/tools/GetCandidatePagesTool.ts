import { BaseTool } from "./BaseTool";
import { CandidatePageProvider } from "../../recommendations/CandidatePageProvider";
import { SitecoreCandidatePageProvider } from "../../sitecore/SitecoreCandidatePageProvider";
import { CandidatePage, CurrentPage } from "../../recommendations/types";

export interface GetCandidatePagesToolInput {
  currentPage: CurrentPage;
  searchQueries: string[];
}

export class GetCandidatePagesTool extends BaseTool<
  GetCandidatePagesToolInput,
  CandidatePage[]
> {
  readonly name = "get_candidate_pages";

  readonly description =
    "Retrieves relevant candidate pages from the current Sitecore site for internal linking based on a set of search queries.";

  constructor(
    private readonly candidatePageProvider: CandidatePageProvider = new SitecoreCandidatePageProvider(),
  ) {
    super();
  }

  protected async run(
    input: GetCandidatePagesToolInput,
  ): Promise<CandidatePage[]> {
    const { currentPage, searchQueries } = input;

    console.info("[LinkWise][Tool][GetCandidatePages] Retrieving candidates", {
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      language: currentPage.language,
      queryCount: searchQueries.length,
    });

    const candidates = await this.candidatePageProvider.getCandidates(
      currentPage,
      searchQueries,
    );

    console.info("[LinkWise][Tool][GetCandidatePages] Candidates retrieved", {
      candidateCount: candidates.length,
    });

    return candidates;
  }
}
