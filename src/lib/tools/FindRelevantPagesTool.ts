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

    // Only return actual pages (under /Home/) — not datasources, footers, or other content items
    const pageResults = pages.filter((p) =>
      p.path.toLowerCase().includes("/home/"),
    );

    console.info("[LinkWise][Tool][FindRelevantPages] Filtered to pages under /Home/", {
      total: pages.length,
      pages: pageResults.length,
    });

    return pageResults.map((page) => ({
      ...page,
      content: (page as any).plainTextContent ?? page.content,
    }));
  }
}
