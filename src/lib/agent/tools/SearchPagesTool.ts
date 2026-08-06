import { BaseTool } from "./BaseTool";
import { SitecoreContentService } from "../../sitecore/SitecoreContentService";
import { CandidatePage } from "../../recommendations/types";

export interface SearchPagesToolInput {
  siteName: string;
  query: string;
}

export class SearchPagesTool extends BaseTool<
  SearchPagesToolInput,
  CandidatePage[]
> {
  readonly name = "search_pages";

  readonly description =
    "Search Sitecore pages within a site using a natural language query.";

  constructor(private readonly contentService = new SitecoreContentService()) {
    super();
  }

  protected async run(input: SearchPagesToolInput): Promise<CandidatePage[]> {
    return this.contentService.searchCandidatePages(
      input.siteName,
      input.query,
    );
  }
}
