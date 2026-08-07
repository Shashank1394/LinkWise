import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  ContentSearchQueriesSchema,
  LinkOpportunitiesSchema,
  LinkOpportunitySchema,
  PageReferenceSchema,
} from "./schemas";

/**
 * Preservation property tests for schema validation behavior.
 * These tests verify the contracts of schemas that are NOT affected by the bugs.
 *
 * **Validates: Requirements 3.1, 3.2**
 */

describe("Preservation: ContentSearchQueriesSchema", () => {
  it("Property: For all valid inputs, ContentSearchQueriesSchema accepts arrays of 1-8 non-empty trimmed strings (min 2 chars, max 120)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 2, maxLength: 120 }).filter((s) => s.trim().length >= 2),
          { minLength: 1, maxLength: 8 }
        ),
        (queries) => {
          const result = ContentSearchQueriesSchema.safeParse(queries);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.length).toBeGreaterThanOrEqual(1);
            expect(result.data.length).toBeLessThanOrEqual(8);
            for (const q of result.data) {
              expect(q.length).toBeGreaterThanOrEqual(2);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property: ContentSearchQueriesSchema rejects empty arrays", () => {
    const result = ContentSearchQueriesSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("Property: ContentSearchQueriesSchema rejects arrays with more than 8 items", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 3, maxLength: 50 }),
          { minLength: 9, maxLength: 20 }
        ),
        (queries) => {
          const result = ContentSearchQueriesSchema.safeParse(queries);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Property: ContentSearchQueriesSchema rejects strings shorter than 2 chars after trim", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom("a", " ", "x"),
          { minLength: 1, maxLength: 5 }
        ),
        (queries) => {
          const result = ContentSearchQueriesSchema.safeParse(queries);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("Preservation: LinkOpportunitiesSchema", () => {
  const validOpportunityArb = fc.record({
    sourceText: fc.string({ minLength: 1, maxLength: 100 }),
    anchorText: fc.string({ minLength: 1, maxLength: 100 }),
    destination: fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      path: fc.string({ minLength: 1, maxLength: 200 }),
    }),
    score: fc.integer({ min: 0, max: 100 }),
    reason: fc.string({ minLength: 1, maxLength: 200 }),
    seoBenefit: fc.string({ minLength: 1, maxLength: 200 }),
  });

  it("Property: For all valid LinkOpportunity arrays (0-8 items), LinkOpportunitiesSchema parses successfully", () => {
    fc.assert(
      fc.property(
        fc.array(validOpportunityArb, { minLength: 0, maxLength: 8 }),
        (opportunities) => {
          const result = LinkOpportunitiesSchema.safeParse(opportunities);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.length).toBeLessThanOrEqual(8);
            for (const opp of result.data) {
              expect(opp.sourceText.length).toBeGreaterThanOrEqual(1);
              expect(opp.anchorText.length).toBeGreaterThanOrEqual(1);
              expect(opp.destination.id.length).toBeGreaterThanOrEqual(1);
              expect(opp.destination.title.length).toBeGreaterThanOrEqual(1);
              expect(opp.destination.path.length).toBeGreaterThanOrEqual(1);
              expect(opp.score).toBeGreaterThanOrEqual(0);
              expect(opp.score).toBeLessThanOrEqual(100);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property: For all valid single LinkOpportunity objects, the schema validates correctly", () => {
    fc.assert(
      fc.property(validOpportunityArb, (opportunity) => {
        const result = LinkOpportunitySchema.safeParse(opportunity);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: PageReferenceSchema requires id, title, and path as strings", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          path: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        (pageRef) => {
          const result = PageReferenceSchema.safeParse(pageRef);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toHaveProperty("id");
            expect(result.data).toHaveProperty("title");
            expect(result.data).toHaveProperty("path");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
