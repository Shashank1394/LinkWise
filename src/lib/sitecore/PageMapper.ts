import { RetrievedPage } from "../types";
import { PageSearchResult } from "./types";

export function mapToRelevantPage(page: PageSearchResult): RetrievedPage {
  const fields = Object.fromEntries(page.fields.map((f) => [f.name, f.value]));
  const content = fields.Content ?? fields.Text ?? fields.Body;

  return {
    id: page.itemId,
    title: fields.Title ?? page.name,
    path: page.path,
    description: fields.Description,
    content,
  };
}
