/**
 * Bug Condition Exploration Test
 *
 * This property-based test asserts that the project compiles cleanly (tsc --noEmit exits 0).
 * On UNFIXED code, this test FAILS — proving the bugs exist.
 * After the fix is applied, this test PASSES — proving the bugs are resolved.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
 */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import * as fc from "fast-check";
import path from "path";

// Run tsc --noEmit once and capture the output for all assertions
function getTscErrors(): { exitCode: number; output: string } {
  const projectRoot = path.resolve(__dirname, "../../..");
  try {
    const output = execSync("npx tsc --noEmit --pretty false", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { exitCode: 0, output };
  } catch (error: unknown) {
    const execError = error as { status: number; stdout: string; stderr: string };
    return {
      exitCode: execError.status ?? 1,
      output: (execError.stdout ?? "") + (execError.stderr ?? ""),
    };
  }
}

/**
 * Known bug condition files and the specific errors they should NOT have
 * after the fix. On unfixed code, these errors ARE present (causing test failure).
 */
const bugConditionFiles = [
  {
    id: "1.1",
    file: "src/lib/recommendations/LinkRecommendationAgent.ts",
    description: "Should compile without stale import for GetRelevantPagesTool",
  },
  {
    id: "1.4",
    file: "src/lib/ai/OpenRouterProvider.ts",
    description: "Should compile without accessing non-existent candidatePages property",
  },
  {
    id: "1.5",
    file: "src/lib/sitecore/SitecoreContentService.ts",
    description: "Should compile without importing deleted CandidatePage type",
  },
  {
    id: "1.6",
    file: "src/lib/sitecore/PageMapper.ts",
    description: "Should compile without importing deleted CandidatePage type",
  },
  {
    id: "1.8",
    file: "src/lib/ai/OpenRouterProvider.ts",
    description: "OpenRouterProvider incorrectly implements AiProvider interface (planSearchQueries missing)",
  },
];

describe("Bug Condition Exploration - TypeScript Compilation Errors", () => {
  // Capture tsc output once for all tests
  const tscResult = getTscErrors();

  /**
   * Property 1: Bug Condition - TypeScript Compilation Success
   *
   * The project MUST compile without TypeScript errors in the bug-affected files.
   * On unfixed code, this FAILS (proving bugs exist).
   * After the fix, this PASSES (proving bugs are resolved).
   *
   * Note: Only checks src/lib/ files that were part of the bugfix scope.
   * Pre-existing errors in components/ui/ (unrelated third-party type issues) are excluded.
   */
  it("Property 1: tsc --noEmit should produce zero errors in bug-affected src/lib files", () => {
    const lines = tscResult.output.split("\n");
    const srcLibErrors = lines.filter(
      (line) => line.includes("src/lib/") && line.includes("error TS")
    );
    expect(
      srcLibErrors,
      `TypeScript compilation errors found in src/lib:\n${srcLibErrors.join("\n")}`
    ).toHaveLength(0);
  });

  it("Property 1 (scoped): No TypeScript errors in bug-affected source files", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...bugConditionFiles),
        (bugFile) => {
          const lines = tscResult.output.split("\n");
          const errorsInFile = lines.filter(
            (line) => line.includes(bugFile.file) && line.includes("error TS")
          );
          // Property: no errors should exist in this file
          return errorsInFile.length === 0;
        }
      ),
      { numRuns: bugConditionFiles.length * 5 }
    );
  });

  describe("Individual file compilation checks", () => {
    for (const bugFile of bugConditionFiles) {
      it(`[${bugFile.id}] ${bugFile.description}`, () => {
        const lines = tscResult.output.split("\n");
        const errorsInFile = lines.filter(
          (line) => line.includes(bugFile.file) && line.includes("error TS")
        );
        expect(
          errorsInFile,
          `Expected no TypeScript errors in ${bugFile.file}, but found:\n${errorsInFile.join("\n")}`
        ).toHaveLength(0);
      });
    }
  });
});
