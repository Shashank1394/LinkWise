import { createAiProvider } from "../ai/factory";
import { SitecoreCandidatePageProvider } from "../sitecore/SitecoreCandidatePageProvider";
import { SitecoreContentService } from "../sitecore/SitecoreContentService";
import { LinkAnalysisService } from "./LinkAnalysisService";

export function createLinkAnalysisService() {
  const contentService = new SitecoreContentService();

  return new LinkAnalysisService(
    createAiProvider(),
    new SitecoreCandidatePageProvider(contentService),
    contentService,
  );
}
