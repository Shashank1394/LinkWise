import { BaseTool } from "./BaseTool";
import { RelevantPageProvider } from "../../recommendations/RelevantPageProvider";
import { CurrentPage, RelevantPage } from "../../recommendations/types";

export interface FindRelevantPagesToolInput {
  currentPage: CurrentPage;
  searchQueries: string[];
}

export class FindRelevantPagesTool extends BaseTool<
  FindRelevantPagesToolInput,
  RelevantPage[]
> {
  readonly name = "find_relevant_pages";

  readonly description =
    "Finds relevant pages from the current Sitecore site using the supplied search queries.";

  constructor(private readonly pageProvider: RelevantPageProvider) {
    super();
  }

  protected async executeInternal(
    input: FindRelevantPagesToolInput,
  ): Promise<RelevantPage[]> {
    const { currentPage, searchQueries } = input;

    console.info(
      "[LinkWise][Tool][FindRelevantPages] Retrieving relevant pages",
      {
        pageId: currentPage.id,
        siteName: currentPage.siteName,
        language: currentPage.language,
        queryCount: searchQueries.length,
      },
    );

    const relevantPages = await this.pageProvider.getRelevantPages(
      currentPage,
      searchQueries,
    );

    console.info(
      "[LinkWise][Tool][FindRelevantPages] Relevant pages retrieved",
      {
        relevantPages: relevantPages.length,
      },
    );

    return relevantPages;
  }
}
