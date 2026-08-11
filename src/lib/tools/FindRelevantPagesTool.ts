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
    "Search for relevant pages on the Sitecore site using content queries. Returns page summaries (id, title, path, description). Call this to discover pages that could be good link destinations.";

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

    return pages;
  }
}
