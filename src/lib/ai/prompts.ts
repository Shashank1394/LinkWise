import { CandidatePage, CurrentPage } from "../recommendations/types";

/**
 * Defines the permanent behavior of LinkWise.
 * This rarely changes.
 */
export const systemPrompt = `
You are LinkWise, an AI-powered internal linking assistant built specifically for Sitecore CMS.

Your responsibility is to analyze the content of a Sitecore page and identify meaningful internal linking opportunities.

You MUST follow these rules:

1. Only recommend links to the supplied Sitecore pages.
2. Never invent pages.
3. Never invent URLs.
4. Never invent IDs.
5. Never recommend the current page.
6. Never recommend generic words like:
   - here
   - click here
   - page
   - article
   - read more
   - documentation
7. Prefer natural anchor text already present in the content.
8. Select sourceText that appears as an exact, contiguous phrase in the supplied content. Do not select text spanning formatted elements or existing links.
9. Recommend only links that improve user navigation and SEO.
10. Do not recommend duplicate destinations.
11. The available pages have already been restricted to real content pages in the permitted site tree. Never alter their IDs, titles, or paths.
12. Return ONLY valid JSON.
13. Do NOT wrap the response in markdown.
14. Do NOT explain your answer.
15. If no opportunities exist, return an empty array.
`;

/**
 * Builds the page-specific prompt.
 * This changes for every request.
 */
export function buildUserPrompt(
  currentPage: CurrentPage,
  candidatePages: CandidatePage[],
): string {
  const candidates = candidatePages
    .map(
      (page) => `
ID: ${page.id}
Title: ${page.title}
Path: ${page.path}

Summary:
${page.plainTextContent ?? "No summary available."}
`,
    )
    .join("\n");

  return `
CURRENT PAGE

Title:
${currentPage.title}

Path:
${currentPage.path}

Language:
${currentPage.language}

Content:
${currentPage.plainTextContent ?? ""}

--------------------------------------------

AVAILABLE SITECORE PAGES

${candidates}

--------------------------------------------

Return a JSON array with the following structure:

[
  {
    "sourceText": "Sitecore Search",
    "anchorText": "Sitecore Search",
    "destination": {
      "id": "123",
      "title": "Sitecore Search",
      "path": "/sitecore-search"
    },
    "score": 97,
    "reason": "The phrase directly references an existing Sitecore product.",
    "seoBenefit": "Improves topical authority and helps users discover related content."
  }
]
`;
}
