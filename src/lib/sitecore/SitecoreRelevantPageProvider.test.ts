import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { SitecoreRelevantPageProvider } from "./SitecoreRelevantPageProvider";
import { CurrentPage, RelevantPage } from "../recommendations/types";

/**
 * Preservation property tests for SitecoreRelevantPageProvider.
 * Tests that:
 * - searchCandidatePages and getContentTreeCandidates return arrays of pages with id, title, and path
 * - The provider excludes the current page from results
 * - Results are deduplicated
 *
 * **Validates: Requirements 3.3, 3.4, 3.5**
 */

// Arbitrary generators
const currentPageArb: fc.Arbitrary<CurrentPage> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
  language: fc.constantFrom("en", "fr", "de", "es"),
  siteName: fc.string({ minLength: 1, maxLength: 50 }),
  plainTextContent: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
});

const relevantPageArb: fc.Arbitrary<RelevantPage> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
  description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  plainTextContent: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
});

const searchQueriesArb = fc.array(
  fc.string({ minLength: 4, maxLength: 80 }),
  { minLength: 1, maxLength: 8 }
);

describe("Preservation: SitecoreRelevantPageProvider", () => {
  it("Property: For all search queries, getRelevantPages excludes the current page from results", async () => {
    await fc.assert(
      fc.asyncProperty(
        currentPageArb,
        searchQueriesArb,
        fc.array(relevantPageArb, { minLength: 1, maxLength: 15 }),
        async (currentPage, searchQueries, mockPages) => {
          // Include the current page in mock search results
          const pagesWithCurrent: RelevantPage[] = [
            ...mockPages,
            { id: currentPage.id, title: "Current Page", path: currentPage.path },
          ];

          // Create a mock content service and pass it directly
          const mockContentService = {
            searchCandidatePages: vi.fn().mockResolvedValue(pagesWithCurrent),
            getContentTreeCandidates: vi.fn().mockResolvedValue([]),
          } as any;

          const provider = new SitecoreRelevantPageProvider(mockContentService);
          const result = await provider.getRelevantPages(currentPage, searchQueries);

          // Current page must be excluded
          for (const page of result) {
            expect(page.id).not.toBe(currentPage.id);
            expect(page.path).not.toBe(currentPage.path);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it("Property: getRelevantPages returns deduplicated results (unique by id)", async () => {
    await fc.assert(
      fc.asyncProperty(
        currentPageArb,
        searchQueriesArb,
        relevantPageArb,
        async (currentPage, searchQueries, duplicatePage) => {
          // Return the same page multiple times from search
          const duplicatedResults: RelevantPage[] = [
            duplicatePage,
            duplicatePage,
            duplicatePage,
          ];

          const mockContentService = {
            searchCandidatePages: vi.fn().mockResolvedValue(duplicatedResults),
            getContentTreeCandidates: vi.fn().mockResolvedValue([]),
          } as any;

          const provider = new SitecoreRelevantPageProvider(mockContentService);
          const result = await provider.getRelevantPages(currentPage, searchQueries);

          // Check uniqueness by id
          const ids = result.map((p) => p.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("Property: All returned pages have id, title, and path properties", async () => {
    await fc.assert(
      fc.asyncProperty(
        currentPageArb,
        searchQueriesArb,
        fc.array(relevantPageArb, { minLength: 1, maxLength: 10 }),
        async (currentPage, searchQueries, mockPages) => {
          const mockContentService = {
            searchCandidatePages: vi.fn().mockResolvedValue(mockPages),
            getContentTreeCandidates: vi.fn().mockResolvedValue([]),
          } as any;

          const provider = new SitecoreRelevantPageProvider(mockContentService);
          const result = await provider.getRelevantPages(currentPage, searchQueries);

          // Every page must have id, title, and path
          for (const page of result) {
            expect(page).toHaveProperty("id");
            expect(page).toHaveProperty("title");
            expect(page).toHaveProperty("path");
            expect(typeof page.id).toBe("string");
            expect(typeof page.title).toBe("string");
            expect(typeof page.path).toBe("string");
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
