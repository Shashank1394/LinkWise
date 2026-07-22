import { LinkAnalysisService } from "./LinkAnalysisService";

import { createAiProvider } from "../ai/factory";

export function createLinkAnalysisService() {
  return new LinkAnalysisService(createAiProvider());
}
