import { AgentApiClient } from "./AgentApiClient";
import { mapToCandidatePage } from "./PageMapper";
import {
  CandidatePage,
  CurrentPage,
  LinkOpportunity,
} from "../recommendations/types";

export class SitecoreContentService {
  constructor(private readonly client = new AgentApiClient()) {}

  async searchCandidatePages(siteName: string, query: string) {
    const results = await this.client.searchPages(siteName, query);

    return results.map(mapToCandidatePage);
  }

  async getContentTreeCandidates(
    siteName: string,
    language: string,
  ): Promise<CandidatePage[]> {
    const pages = await this.client.getSitePages(siteName, language);

    console.info("[LinkWise][ContentService] Loading site pages", {
      siteName,
      language,
      totalPages: pages.length,
    });

    const eligiblePages = pages
      .map((page) => ({
        id: page.id,
        title: page.path.split("/").filter(Boolean).at(-1) ?? page.path,
        path: page.path,
      }))
      .slice(0, 60);

    console.info("[LinkWise][ContentService] Candidate pages loaded", {
      eligiblePages: eligiblePages.length,
    });

    const results = await Promise.allSettled(
      eligiblePages.map((page) =>
        this.client.getContentItem(page.id, language),
      ),
    );

    return results.flatMap((result, index) => {
      if (result.status !== "fulfilled") {
        return [];
      }

      const item = result.value;
      const fields = item.fields ?? {};
      const title = getStringField(fields, [
        "Title",
        "Page Title",
        "NavigationTitle",
      ]);
      const description = getStringField(fields, [
        "Description",
        "Summary",
        "Teaser",
      ]);
      const content = getStringField(fields, [
        "Content",
        "Text",
        "Body",
        "MainContent",
      ]);

      return [
        {
          id: item.itemId,
          title: title || item.name || eligiblePages[index].title,
          path: item.path,
          description,
          plainTextContent: content ? htmlToPlainText(content) : undefined,
        },
      ];
    });
  }

  async getPagePlainText(pageId: string, language: string): Promise<string> {
    const pageItem = await this.client.getContentItem(pageId, language);
    const pageComponents = await this.client.getPageComponents(
      pageId,
      language,
    );
    const dataSourceFields = await this.getDataSourceRichTextFields(
      pageComponents.components ?? [],
    );
    const dataSourceResults = await Promise.allSettled(
      [...dataSourceFields.keys()].map((dataSourceId) =>
        this.client.getContentItem(dataSourceId, language),
      ),
    );
    const dataSources = dataSourceResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );

    return [pageItem, ...dataSources]
      .flatMap((item) =>
        getRichTextValues(
          item.fields,
          dataSourceFields.get(item.itemId) ?? getRichTextFieldNames(),
        ),
      )
      .map(htmlToPlainText)
      .filter(Boolean)
      .join("\n\n");
  }

  async insertApprovedLink(
    currentPage: CurrentPage,
    opportunity: LinkOpportunity,
  ): Promise<void> {
    const destination = await this.client.getContentItem(
      opportunity.destination.id,
      currentPage.language,
    );

    if (!destination) {
      throw new Error("Destination page could not be found.");
    }

    const source = await this.findSourceContentItem(
      currentPage.id,
      currentPage.language,
      opportunity.sourceText,
    );

    if (!source) {
      throw new Error(
        "Could not find the suggested text in an editable rich-text field on this page.",
      );
    }

    const link = createSitecoreLink(
      opportunity.destination.id,
      opportunity.anchorText,
    );
    const updatedValue = source.field.value.replace(
      opportunity.sourceText,
      link,
    );

    await this.client.updateContentItem(
      source.itemId,
      { [source.field.name]: updatedValue },
      currentPage.language,
      currentPage.siteName,
    );
  }

  private async findSourceContentItem(
    pageId: string,
    language: string,
    sourceText: string,
  ): Promise<
    | {
        itemId: string;
        field: { name: string; value: string };
      }
    | undefined
  > {
    const pageItem = await this.client.getContentItem(pageId, language);
    const pageField = findLinkableField(
      pageItem.fields,
      sourceText,
      getRichTextFieldNames(),
    );

    if (pageField) {
      return { itemId: pageItem.itemId, field: pageField };
    }

    const pageComponents = await this.client.getPageComponents(
      pageId,
      language,
    );
    const dataSourceFields = await this.getDataSourceRichTextFields(
      pageComponents.components ?? [],
    );

    for (const [dataSourceId, richTextFields] of dataSourceFields) {
      const dataSource = await this.client.getContentItem(
        dataSourceId,
        language,
      );
      const field = findLinkableField(
        dataSource.fields,
        sourceText,
        richTextFields,
      );

      if (field) {
        return { itemId: dataSource.itemId, field };
      }
    }

    return undefined;
  }

  async isSourceTextLinkable(
    currentPage: CurrentPage,
    sourceText: string,
  ): Promise<boolean> {
    return Boolean(
      await this.findSourceContentItem(
        currentPage.id,
        currentPage.language,
        sourceText,
      ),
    );
  }

  private async getDataSourceRichTextFields(
    components: Array<{ componentId: string; dataSource?: string | null }>,
  ): Promise<Map<string, string[]>> {
    const results = await Promise.allSettled(
      components
        .filter(
          (
            component,
          ): component is { componentId: string; dataSource: string } =>
            Boolean(component.dataSource),
        )
        .map(async (component) => {
          const definition = await this.client.getComponent(
            component.componentId,
          );
          const fields = definition.datasourceFields
            .filter((field) => /rich\s*text/i.test(field.type))
            .map((field) => field.name.toLowerCase());

          return [component.dataSource, fields] as const;
        }),
    );
    const dataSourceFields = new Map<string, string[]>();

    for (const result of results) {
      if (result.status !== "fulfilled" || result.value[1].length === 0) {
        continue;
      }

      const [dataSourceId, fields] = result.value;
      dataSourceFields.set(dataSourceId, [
        ...new Set([...(dataSourceFields.get(dataSourceId) ?? []), ...fields]),
      ]);
    }

    return dataSourceFields;
  }
}

function findLinkableField(
  fields: Record<string, unknown> | null | undefined,
  sourceText: string,
  richTextFieldNames: string[],
): { name: string; value: string } | undefined {
  if (!fields) {
    return undefined;
  }

  const entries = Object.entries(fields).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" &&
      richTextFieldNames.includes(entry[0].toLowerCase()) &&
      entry[1].includes(sourceText),
  );
  const [field] = entries.sort(([firstName], [secondName]) => {
    const firstRank = richTextFieldNames.indexOf(firstName.toLowerCase());
    const secondRank = richTextFieldNames.indexOf(secondName.toLowerCase());

    return firstRank - secondRank;
  });

  return field ? { name: field[0], value: field[1] } : undefined;
}

function getRichTextValues(
  fields: Record<string, unknown> | null | undefined,
  richTextFieldNames: string[],
): string[] {
  if (!fields) {
    return [];
  }

  return Object.entries(fields)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" &&
        richTextFieldNames.includes(entry[0].toLowerCase()),
    )
    .map(([, value]) => value);
}

function getRichTextFieldNames(): string[] {
  return (
    process.env.SITECORE_RICH_TEXT_FIELDS ?? "Content,Text,Body,MainContent"
  )
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

function getStringField(
  fields: Record<string, unknown>,
  names: string[],
): string | undefined {
  for (const name of names) {
    const value = fields[name];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function createSitecoreLink(itemId: string, anchorText: string): string {
  const href = `~/link.aspx?_id=${encodeURIComponent(itemId)}&_z=z`;
  const escapedText = anchorText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<a href="${href.replace(/&/g, "&amp;")}">${escapedText}</a>`;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
