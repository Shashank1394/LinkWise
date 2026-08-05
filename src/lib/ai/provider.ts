import {
  CurrentPage,
  LinkAnalysisRequest,
  LinkOpportunity,
} from "../recommendations/types";

export interface AiProvider {
  requestCandidateSearch(currentPage: CurrentPage): Promise<string[]>;

  submitLinkRecommendations(
    request: LinkAnalysisRequest,
  ): Promise<LinkOpportunity[]>;
}
