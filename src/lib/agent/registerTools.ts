import { ToolRegistry } from "./ToolRegistry";
import { FindRelevantPagesTool } from "./tools/FindRelevantPagesTool";
import { GetPageContentTool } from "./tools/GetPageContentTool";

import { SitecoreRelevantPageProvider } from "../sitecore/SitecoreRelevantPageProvider";
import { SitecoreContentService } from "../sitecore/SitecoreContentService";

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  const contentService = new SitecoreContentService();
  const relevantPageProvider = new SitecoreRelevantPageProvider(contentService);

  registry.register(new FindRelevantPagesTool(relevantPageProvider));

  registry.register(new GetPageContentTool(contentService));

  console.info("[LinkWise][ToolRegistry] Registered tools", {
    tools: registry.list(),
  });

  return registry;
}
