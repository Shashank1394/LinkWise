import { BaseTool } from "./BaseTool";
import { SitecoreContentService } from "../../sitecore/SitecoreContentService";
import { RetrievedPage } from "../../recommendations/types";

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
    "Retrieves the plain text content for one or more Sitecore pages.";

  constructor(private readonly contentService = new SitecoreContentService()) {
    super();
  }

  protected async executeInternal(
    input: GetPageContentToolInput,
  ): Promise<RetrievedPage[]> {
    console.info("[LinkWise][Tool][GetPageContent] Retrieving page content", {
      pageCount: input.pageIds.length,
      language: input.language,
    });

    const startedAt = Date.now();

    const results = await Promise.allSettled(
      input.pageIds.map((pageId) =>
        this.contentService.getPageContent(pageId, input.language),
      ),
    );

    const retrievedPages = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );

    console.info("[LinkWise][Tool][GetPageContent] Content retrieved", {
      requested: input.pageIds.length,
      returned: retrievedPages.length,
      durationMs: Date.now() - startedAt,
    });

    return retrievedPages;
  }
}
