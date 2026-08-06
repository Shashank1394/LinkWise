import { Tool } from "../Tool";
import { SitecoreContentService } from "../../sitecore/SitecoreContentService";

export interface SearchCandidatePagesInput {
  siteName: string;
  query: string;
}

export class SearchCandidatePagesTool implements Tool<SearchCandidatePagesInput> {
  readonly name = "search_candidate_pages";

  readonly description =
    "Searches Sitecore for candidate pages matching a query.";

  constructor(private readonly sitecore: SitecoreContentService) {}

  execute(input: SearchCandidatePagesInput) {
    return this.sitecore.searchCandidatePages(input.siteName, input.query);
  }
}
