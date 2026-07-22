import { LinkAnalysisRequest, LinkOpportunity } from "../recommendations/types";

export interface AiProvider {
  generateLinkOpportunities(
    request: LinkAnalysisRequest,
  ): Promise<LinkOpportunity[]>;
}
