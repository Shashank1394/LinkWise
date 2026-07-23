import { CandidatePage } from "../../lib/recommendations/types";
import { PageSearchResult } from "./types";

export function mapToCandidatePage(page: PageSearchResult): CandidatePage {
  const fields = Object.fromEntries(page.fields.map((f) => [f.name, f.value]));

  return {
    id: page.itemId,
    title: fields.Title ?? page.name,
    path: page.path,
    description: fields.Description,
    content: fields.Content,
  };
}
