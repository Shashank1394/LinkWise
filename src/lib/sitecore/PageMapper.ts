import { RetrievedPage } from "../types";
import { PageSearchResult } from "./types";

/**
 * Maps a Sitecore search result to a RetrievedPage.
 * 
 * - Title: uses the item `name` from Sitecore (the actual item name, always reliable)
 * - Content: strips HTML from all field values and concatenates as plain text
 * - Description: first 300 chars of the plain text content
 */
export function mapToRelevantPage(page: PageSearchResult): RetrievedPage {
  // Always use the Sitecore item name as the title — it's the reliable identifier
  const title = page.name;

  // Get all field values, strip HTML, and concatenate as plain text
  const plainTextParts = page.fields
    .map((f) => stripHtml(f.value))
    .filter((v) => v.length > 0);

  const plainTextContent = plainTextParts.join("\n");

  return {
    id: page.itemId,
    title,
    path: page.path,
    description: plainTextContent.slice(0, 300) || undefined,
    plainTextContent: plainTextContent || undefined,
  };
}

/**
 * Strips HTML tags and decodes common entities to produce plain text.
 */
function stripHtml(html: string): string {
  if (!html) return "";

  return html
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
