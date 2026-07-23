import { createAiProvider } from "../ai/factory";
import { SitecoreCandidatePageProvider } from "../sitecore/SitecoreCandidatePageProvider";
import { LinkAnalysisService } from "./LinkAnalysisService";

export function createLinkAnalysisService() {
  return new LinkAnalysisService(
    createAiProvider(),
    new SitecoreCandidatePageProvider(),
  );
}
