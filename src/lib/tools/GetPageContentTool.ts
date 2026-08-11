import { BaseTool } from "./BaseTool";
import { ToolContext } from "./Tool";
import { CurrentPage, RetrievedPage } from "../types";
import { SitecoreContentService } from "../sitecore/SitecoreContentService";

export interface GetPageContentToolInput {
  pageIds: string[];
  language: string;
}

export class GetPageContentTool extends BaseTool<
  GetPageContentToolInput,
  RetrievedPage[]
> {
  readonly name = "get_page_content";

  readonly description =
    "Retrieve the full plain-text content for one or more Sitecore pages by their IDs. Use this to read the body of pages before deciding which links to recommend.";

  readonly parameters = {
    type: "object",
    additionalProperties: false,
    required: ["pageIds"],
    properties: {
      pageIds: {
        type: "array",
        description: "Array of page IDs to retrieve content for.",
        minItems: 1,
        maxItems: 10,
        items: { type: "string" },
      },
    },
  };

  constructor(private readonly contentService: SitecoreContentService) {
    super();
  }

  buildInput(args: Record<string, unknown>, context: ToolContext): GetPageContentToolInput {
    const currentPage = context.currentPage as CurrentPage;
    return {
      pageIds: args.pageIds as string[],
      language: currentPage.language,
    };
  }

  protected async executeInternal(
    input: GetPageContentToolInput,
  ): Promise<RetrievedPage[]> {
    console.info("[LinkWise][Tool][GetPageContent] Retrieving", {
      pageCount: input.pageIds.length,
      pageIds: input.pageIds,
    });

    const startedAt = Date.now();

    const results = await Promise.allSettled(
      input.pageIds.map((id) => this.contentService.getPageContent(id, input.language)),
    );

    const pages = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));

    console.info("[LinkWise][Tool][GetPageContent] Done", {
      requested: input.pageIds.length,
      returned: pages.length,
      durationMs: Date.now() - startedAt,
    });

    return pages;
  }
}
