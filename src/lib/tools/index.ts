import { ToolRegistry } from "./ToolRegistry";
import { FindRelevantPagesTool } from "./FindRelevantPagesTool";
import { GetPageContentTool } from "./GetPageContentTool";
import { SubmitLinkRecommendationsTool } from "./SubmitLinkRecommendationsTool";

import { SitecoreRelevantPageProvider } from "../sitecore/SitecoreRelevantPageProvider";
import { SitecoreContentService } from "../sitecore/SitecoreContentService";

export type { Tool, ToolContext } from "./Tool";
export { toOpenAiTool } from "./Tool";
export { ToolRegistry } from "./ToolRegistry";
export { FindRelevantPagesTool } from "./FindRelevantPagesTool";
export { GetPageContentTool } from "./GetPageContentTool";
export { SubmitLinkRecommendationsTool } from "./SubmitLinkRecommendationsTool";

export function createToolRegistry(): ToolRegistry {
  const contentService = new SitecoreContentService();
  const pageProvider = new SitecoreRelevantPageProvider(contentService);

  const registry = new ToolRegistry();
  registry.register(new FindRelevantPagesTool(pageProvider));
  registry.register(new GetPageContentTool(contentService));
  registry.register(new SubmitLinkRecommendationsTool());

  console.info("[LinkWise][Tools] Registry created", { tools: registry.list() });

  return registry;
}
