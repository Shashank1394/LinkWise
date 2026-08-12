import { BaseTool } from "./BaseTool";
import { ToolContext } from "./Tool";
import { CurrentPage, RelevantPage, RelevantPageProvider } from "../types";

export interface FindRelevantPagesToolInput {
  currentPage: CurrentPage;
  searchQueries: string[];
}

export class FindRelevantPagesTool extends BaseTool<
  FindRelevantPagesToolInput,
  RelevantPage[]
> {
  readonly name = "find_relevant_pages";

  readonly description =
    "Search for relevant pages on the Sitecore site. Returns pages with id, title, path, and their full content. Review all returned pages to find link opportunities.";

  readonly parameters = {
    type: "object",
    additionalProperties: false,
    required: ["queries"],
    properties: {
      queries: {
        type: "array",
        description: "3 to 8 concise search queries describing the page's key topics.",
        minItems: 1,
        maxItems: 8,
        items: { type: "string" },
      },
    },
  };

  constructor(private readonly pageProvider: RelevantPageProvider) {
    super();
  }

  buildInput(args: Record<string, unknown>, context: ToolContext): FindRelevantPagesToolInput {
    return {
      currentPage: context.currentPage as CurrentPage,
      searchQueries: args.queries as string[],
    };
  }

  protected async executeInternal(
    input: FindRelevantPagesToolInput,
  ): Promise<RelevantPage[]> {
    const { currentPage, searchQueries } = input;

    console.info("[LinkWise][Tool][FindRelevantPages] Searching", {
      pageId: currentPage.id,
      siteName: currentPage.siteName,
      queryCount: searchQueries.length,
      queries: searchQueries,
    });

    const pages = await this.pageProvider.getRelevantPages(currentPage, searchQueries);

    console.info("[LinkWise][Tool][FindRelevantPages] Done", {
      count: pages.length,
      pageIds: pages.slice(0, 20).map((p) => p.id),
    });

    // Filter out field-level items — keep actual pages regardless of path structure
    const navigablePages = pages.filter((p) => {
      const lowerPath = p.path.toLowerCase();
      // Exclude items that are clearly field-level data sources (end with field-type names)
      if (lowerPath.endsWith("/rich text")) return false;
      if (lowerPath.endsWith("/content")) return false;
      if (lowerPath.endsWith("/text")) return false;
      if (lowerPath.endsWith("/body")) return false;
      // Exclude items under /data/ that don't have a meaningful slug (likely raw data items)
      if (lowerPath.includes("/data/") && !lowerPath.includes("/data/blog") && !lowerPath.includes("/data/article") && !lowerPath.includes("/data/page")) {
        // Check if path has a meaningful final segment (more than just a field name)
        const lastSegment = p.path.split("/").filter(Boolean).at(-1) ?? "";
        if (lastSegment.length < 5) return false;
      }
      return true;
    });

    console.info("[LinkWise][Tool][FindRelevantPages] Filtered to navigable pages", {
      total: pages.length,
      navigable: navigablePages.length,
    });

    return navigablePages.map((p) => ({
      ...p,
      content: (p as any).plainTextContent ?? p.content,
    }));
  }
}
