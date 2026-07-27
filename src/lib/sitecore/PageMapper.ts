import { CandidatePage } from "../../lib/recommendations/types";
import { PageSearchResult } from "./types";

export function mapToCandidatePage(page: PageSearchResult): CandidatePage {
  const fields = Object.fromEntries(page.fields.map((f) => [f.name, f.value]));
  const content = fields.Content ?? fields.Text ?? fields.Body;

  return {
    id: page.itemId,
    title: fields.Title ?? page.name,
    path: page.path,
    description: fields.Description,
    plainTextContent: content,
  };
}
