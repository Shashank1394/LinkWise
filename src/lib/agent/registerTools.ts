import { ToolRegistry } from "./ToolRegistry";
import { SearchPagesTool } from "./tools/SearchPagesTool";
import { GetCandidatePagesTool } from "./tools/GetCandidatePagesTool";

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.registerMany([new SearchPagesTool(), new GetCandidatePagesTool()]);

  console.info("[LinkWise][ToolRegistry] Registered tools", {
    tools: registry.list(),
  });

  return registry;
}
