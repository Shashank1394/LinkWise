import {
  CurrentPage,
  LinkAnalysisRequest,
  LinkOpportunity,
} from "../recommendations/types";

export interface AiProvider {
  generateContentSearchQueries(currentPage: CurrentPage): Promise<string[]>;

  generateLinkOpportunities(
    request: LinkAnalysisRequest,
  ): Promise<LinkOpportunity[]>;
}
