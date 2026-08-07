import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { mapToRelevantPage } from "./PageMapper";
import { PageSearchResult } from "./types";

/**
 * Preservation property tests for PageMapper.
 * Tests that the page mapping logic correctly produces objects with id, title, and path.
 * This logic is correct and has been preserved during the rename to mapToRelevantPage.
 *
 * **Validates: Requirements 3.3, 3.4**
 */

// Arbitrary for PageSearchField
const pageSearchFieldArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  value: fc.string({ minLength: 0, maxLength: 500 }),
});

// Arbitrary for PageSearchResult
const pageSearchResultArb: fc.Arbitrary<PageSearchResult> = fc.record({
  itemId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
  templateId: fc.uuid(),
  fields: fc.array(pageSearchFieldArb, { minLength: 0, maxLength: 10 }),
});

// Arbitrary for PageSearchResult with Title field explicitly set
const pageSearchResultWithTitleArb: fc.Arbitrary<PageSearchResult> = fc.record({
  itemId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
  templateId: fc.uuid(),
  fields: fc
    .array(pageSearchFieldArb, { minLength: 0, maxLength: 10 })
    .map((fields) => [
      { name: "Title", value: "Explicit Title" },
      ...fields.filter((f) => f.name !== "Title"),
    ]),
});

describe("Preservation: PageMapper (mapToRelevantPage)", () => {
  it("Property: For all PageSearchResult inputs, mapToRelevantPage returns an object with id, title, and path", () => {
    fc.assert(
      fc.property(pageSearchResultArb, (page) => {
        const result = mapToRelevantPage(page);

        // Must have id, title, and path
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("path");
        expect(typeof result.id).toBe("string");
        expect(typeof result.title).toBe("string");
        expect(typeof result.path).toBe("string");
      }),
      { numRuns: 100 }
    );
  });

  it("Property: id is always the itemId from the PageSearchResult", () => {
    fc.assert(
      fc.property(pageSearchResultArb, (page) => {
        const result = mapToRelevantPage(page);
        expect(result.id).toBe(page.itemId);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: path is always the path from the PageSearchResult", () => {
    fc.assert(
      fc.property(pageSearchResultArb, (page) => {
        const result = mapToRelevantPage(page);
        expect(result.path).toBe(page.path);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: title uses Title field when available, otherwise falls back to page.name", () => {
    fc.assert(
      fc.property(pageSearchResultWithTitleArb, (page) => {
        const result = mapToRelevantPage(page);
        // When Title field exists, it should use that
        expect(result.title).toBe("Explicit Title");
      }),
      { numRuns: 50 }
    );

    fc.assert(
      fc.property(
        fc.record({
          itemId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
          templateId: fc.uuid(),
          // Fields without Title, Description, Content, Text, or Body
          fields: fc.constant<Array<{ name: string; value: string }>>([
            { name: "SomeOtherField", value: "other value" },
          ]),
        }),
        (page) => {
          const result = mapToRelevantPage(page);
          // Falls back to page.name when no Title field
          expect(result.title).toBe(page.name);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Property: description is extracted from Description field when present", () => {
    const pageWithDescription: fc.Arbitrary<PageSearchResult> = fc.record({
      itemId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
      templateId: fc.uuid(),
      fields: fc.string({ minLength: 1, maxLength: 200 }).map((desc) => [
        { name: "Description", value: desc },
      ]),
    });

    fc.assert(
      fc.property(pageWithDescription, (page) => {
        const result = mapToRelevantPage(page);
        const descField = page.fields.find((f) => f.name === "Description");
        expect(result.description).toBe(descField?.value);
      }),
      { numRuns: 50 }
    );
  });

  it("Property: content is extracted from Content, Text, or Body field when present", () => {
    const pageWithContent: fc.Arbitrary<PageSearchResult> = fc.record({
      itemId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      path: fc.string({ minLength: 1, maxLength: 200 }).map((s) => "/" + s),
      templateId: fc.uuid(),
      fields: fc.string({ minLength: 1, maxLength: 500 }).map((content) => [
        { name: "Content", value: content },
      ]),
    });

    fc.assert(
      fc.property(pageWithContent, (page) => {
        const result = mapToRelevantPage(page);
        const contentField = page.fields.find((f) => f.name === "Content");
        expect(result.content).toBe(contentField?.value);
      }),
      { numRuns: 50 }
    );
  });
});
