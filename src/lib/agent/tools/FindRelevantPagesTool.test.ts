import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { FindRelevantPagesTool } from "./FindRelevantPagesTool";
import { CurrentPage, RelevantPage } from "../../recommendations/types";
import { RelevantPageProvider } from "../../recommendations/RelevantPageProvider";

/**
 * Preservation property tests for FindRelevantPagesTool.
 * Tests that the tool correctly delegates to the provider and
 * that the provider's contract (excluding current page) is preserved.
 *
 * **Validates: Requirements 3.1, 3.3**
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
  content: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
});

const searchQueriesArb = fc.array(
  fc.string({ minLength: 2, maxLength: 80 }),
  { minLength: 1, maxLength: 8 }
);

describe("Preservation: FindRelevantPagesTool", () => {
  it("Property: For all search queries, FindRelevantPagesTool returns a RelevantPage[] that excludes the current page", async () => {
    await fc.assert(
      fc.asyncProperty(
        currentPageArb,
        searchQueriesArb,
        fc.array(relevantPageArb, { minLength: 0, maxLength: 20 }),
        async (currentPage, searchQueries, mockPages) => {
          // Insert the current page into mock results to test exclusion
          const pagesWithCurrent: RelevantPage[] = [
            ...mockPages,
            { id: currentPage.id, title: "Current", path: currentPage.path },
          ];

          // Create a mock provider that filters out the current page (as the real one does)
          const mockProvider: RelevantPageProvider = {
            getRelevantPages: vi.fn().mockImplementation(
              async (cp: CurrentPage, _queries: string[]) => {
                // Simulate the real behavior: exclude current page by id and path
                return pagesWithCurrent.filter(
                  (p) => p.id !== cp.id && p.path !== cp.path
                );
              }
            ),
          };

          const tool = new FindRelevantPagesTool(mockProvider);
          const result = await tool.execute({ currentPage, searchQueries });

          // Verify: result excludes the current page
          for (const page of result) {
            expect(page.id).not.toBe(currentPage.id);
            expect(page.path).not.toBe(currentPage.path);
          }

          // Verify: all results have the required shape (id, title, path)
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
      { numRuns: 50 }
    );
  });

  it("Property: FindRelevantPagesTool result is always an array", async () => {
    await fc.assert(
      fc.asyncProperty(
        currentPageArb,
        searchQueriesArb,
        async (currentPage, searchQueries) => {
          const mockProvider: RelevantPageProvider = {
            getRelevantPages: vi.fn().mockResolvedValue([]),
          };

          const tool = new FindRelevantPagesTool(mockProvider);
          const result = await tool.execute({ currentPage, searchQueries });

          expect(Array.isArray(result)).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });
});
