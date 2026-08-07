# Implementation Plan

## Overview

Fix all TypeScript compile errors introduced by an incomplete rename refactor (`GetCandidatePages` → `GetRelevantPages`) and simplify the architecture by removing batch-review complexity. The fix spans seven files: `LinkRecommendationAgent.ts`, `provider.ts`, `OpenRouterProvider.ts`, `SitecoreContentService.ts`, `PageMapper.ts`, `schemas.ts`, and `AgentLoop.ts`.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3.1"] },
    { "wave": 3, "tasks": ["3.2", "3.5"] },
    { "wave": 4, "tasks": ["3.3", "3.4"] },
    { "wave": 5, "tasks": ["3.6", "3.7"] },
    { "wave": 6, "tasks": ["3.8", "3.9"] },
    { "wave": 7, "tasks": ["4"] }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - TypeScript Compilation Errors
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface all TypeScript compiler errors that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic compile errors, scope the property to the concrete failing cases to ensure reproducibility
  - Run `tsc --noEmit` on the UNFIXED code and capture the TypeScript error output
  - Verify each expected error is present:
    1. `LinkRecommendationAgent.ts`: "Cannot find module '../agent/tools/GetRelevantPagesTool'"
    2. `LinkRecommendationAgent.ts`: type error for `GetRelevantPagesTool` vs `FindRelevantPagesTool`
    3. `LinkRecommendationAgent.ts`: "Cannot find name 'relevantPages'" in return statement
    4. `OpenRouterProvider.ts`: "Property 'candidatePages' does not exist on type 'LinkAnalysisRequest'"
    5. `SitecoreContentService.ts`: "Module has no exported member 'CandidatePage'"
    6. `PageMapper.ts`: "Module has no exported member 'CandidatePage'"
    7. `provider.ts`: "Class 'OpenRouterProvider' incorrectly implements interface 'AiProvider'" (due to `planSearchQueries`/`reviewPageBatch`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: `tsc --noEmit` FAILS with 6+ errors (this is correct — it proves the bugs exist)
  - Document all counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Link Analysis Workflow Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for workflows that do NOT hit the compile errors (because the project doesn't compile, these tests must be written against mock/unit boundaries)
  - Write property-based tests capturing the preserved behaviors from the Preservation Requirements in design:
    - For all valid `CurrentPage` inputs, `requestCandidateSearch` produces an array of 1–8 non-empty query strings
    - For all `LinkAnalysisRequest` inputs with `retrievedPages`, `submitLinkRecommendations` returns a `LinkOpportunity[]` with at most 8 items
    - For all search queries, `FindRelevantPagesTool` returns a `RelevantPage[]` that excludes the current page
    - `SitecoreContentService.searchCandidatePages` and `getContentTreeCandidates` return arrays of pages with `id`, `title`, and `path`
  - Run tests on UNFIXED code (against the preserved, non-broken paths)
  - **EXPECTED OUTCOME**: Preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix TypeScript compile errors and simplify architecture

  - [x] 3.1 Fix imports and tool references in LinkRecommendationAgent.ts
    - Change `import { GetRelevantPagesTool } from "../agent/tools/GetRelevantPagesTool"` to `import { FindRelevantPagesTool } from "../agent/tools/FindRelevantPagesTool"`
    - Change `this.toolRegistry.get<GetRelevantPagesTool>("get_relevant_pages")` to `this.toolRegistry.get<FindRelevantPagesTool>("find_relevant_pages")`
    - Fix error message: `'Tool "get_relevant_pages" is not registered.'` → `'Tool "find_relevant_pages" is not registered.'`
    - Fix return statement: `relevantPages: relevantPages` → `relevantPages: candidatePages`
    - _Bug_Condition: isBugCondition(input) where input.file == "LinkRecommendationAgent.ts" AND (stale import OR incorrect tool name OR undefined variable)_
    - _Expected_Behavior: Correct import, tool name "find_relevant_pages", and return variable "candidatePages"_
    - _Preservation: Link analysis workflow (requestCandidateSearch → FindRelevantPagesTool → submitLinkRecommendations) must continue to work_
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [x] 3.2 Fix AiProvider interface in provider.ts
    - Remove `planSearchQueries(currentPage: CurrentPage): Promise<string[]>` method declaration
    - Add `requestCandidateSearch(currentPage: CurrentPage): Promise<string[]>` method declaration
    - Remove `reviewPageBatch(request: BatchReviewRequest): Promise<BatchReviewResult>` method declaration
    - Remove imports for `BatchReviewRequest` and `BatchReviewResult` from types
    - _Bug_Condition: isBugCondition(input) where input.file == "provider.ts" AND input.interfaceMethod IN ["planSearchQueries", "reviewPageBatch"]_
    - _Expected_Behavior: Interface declares only requestCandidateSearch and submitLinkRecommendations_
    - _Preservation: OpenRouterProvider must continue to correctly implement AiProvider_
    - _Requirements: 2.8, 3.1, 3.2_

  - [x] 3.3 Fix OpenRouterProvider.ts — access retrievedPages and remove batch review
    - Change `candidatePages: request.candidatePages.map(...)` to `candidatePages: request.retrievedPages.map(...)` in `submitLinkRecommendations`
    - Remove the `reviewPageBatch` async method entirely
    - Remove the `reviewPageBatchTool: ChatCompletionTool` constant and `pageBatchReviewInstructions` string
    - Remove the `selectRelevantPagesTool` constant and `pageSelectionInstructions` string (unused old batch-review artifacts)
    - Remove imports for `BatchReviewResultSchema` from schemas, and `BatchReviewRequest`/`BatchReviewResult` from types
    - _Bug_Condition: isBugCondition(input) where input.file == "OpenRouterProvider.ts" AND input.accessPath == "request.candidatePages"_
    - _Expected_Behavior: Access request.retrievedPages; no reviewPageBatch method; simplified provider_
    - _Preservation: requestCandidateSearch and submitLinkRecommendations must continue to work as before_
    - _Requirements: 2.4, 2.8, 3.1, 3.2_

  - [x] 3.4 Remove CandidatePage usages in SitecoreContentService.ts
    - Change import from `import { CandidatePage, CurrentPage, LinkOpportunity }` to `import { RelevantPage, CurrentPage, LinkOpportunity }` from `../recommendations/types`
    - Update `import { mapToCandidatePage }` to `import { mapToRelevantPage }` from `./PageMapper`
    - Update `searchCandidatePages` return type from implicit `CandidatePage[]` to `RelevantPage[]`
    - Update `getContentTreeCandidates` return type from `Promise<CandidatePage[]>` to `Promise<RelevantPage[]>`
    - Update all `mapToCandidatePage(...)` call sites to `mapToRelevantPage(...)`
    - _Bug_Condition: isBugCondition(input) where input.file == "SitecoreContentService.ts" AND input.importedType == "CandidatePage"_
    - _Expected_Behavior: Use RelevantPage type throughout; all methods return RelevantPage[]_
    - _Preservation: searchCandidatePages and getContentTreeCandidates must continue to return correctly mapped pages_
    - _Requirements: 2.5, 3.3_

  - [x] 3.5 Fix PageMapper.ts — rename to mapToRelevantPage and use RelevantPage type
    - Change `import { CandidatePage } from "../../lib/recommendations/types"` to `import { RelevantPage } from "../../lib/recommendations/types"`
    - Rename function `mapToCandidatePage` to `mapToRelevantPage`
    - Update the function return type from `CandidatePage` to `RelevantPage`
    - _Bug_Condition: isBugCondition(input) where input.file == "PageMapper.ts" AND input.returnType == "CandidatePage"_
    - _Expected_Behavior: mapToRelevantPage returns RelevantPage; import uses RelevantPage_
    - _Preservation: Page mapping logic (id, title, path, description, plainTextContent) must remain identical_
    - _Requirements: 2.6, 3.3_

  - [x] 3.6 Clean up schemas.ts — remove BatchReviewResultSchema
    - Remove the `BatchReviewResultSchema` zod schema definition entirely
    - Remove the exported `BatchReviewResult` type alias if present (batch review is removed)
    - Retain all other schemas: `PageReferenceSchema`, `SelectedPageIdsSchema`, `LinkOpportunitySchema`, `LinkOpportunitiesSchema`, `ContentSearchQueriesSchema`, `LinkOpportunityResponse`
    - _Bug_Condition: isBugCondition(input) where input.file == "schemas.ts" AND input.schemaField == "pageIdsToRead"_
    - _Expected_Behavior: BatchReviewResultSchema removed; no schema/interface mismatch_
    - _Preservation: All other schemas must remain intact and continue to validate correctly_
    - _Requirements: 2.7_

  - [x] 3.7 Delete AgentLoop.ts
    - Verify no other file imports from `AgentLoop.ts` before deleting
    - Delete `src/lib/agent/AgentLoop.ts` — the file is empty and not imported anywhere
    - _Bug_Condition: isBugCondition(input) where input.file == "AgentLoop.ts" AND input.exportedContent == EMPTY_
    - _Expected_Behavior: File removed; no empty exported module in the codebase_
    - _Preservation: No other files reference AgentLoop.ts so deletion has no downstream impact_
    - _Requirements: 2.9_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - TypeScript Compilation Success
    - **IMPORTANT**: Re-run the SAME check from task 1 — do NOT write a new test
    - Run `tsc --noEmit` on the FIXED code
    - **EXPECTED OUTCOME**: `tsc --noEmit` exits with code 0 and zero errors (confirms all bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Link Analysis Workflow Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in link analysis workflow)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `tsc --noEmit` and confirm exit code is 0 with zero TypeScript errors
  - Run all unit and property-based tests and confirm they pass
  - Verify the link analysis workflow functions end-to-end (requestCandidateSearch → FindRelevantPagesTool → submitLinkRecommendations)
  - Ensure all tests pass; ask the user if questions arise

## Notes

- Task 3.5 (PageMapper.ts) must be completed before 3.4 (SitecoreContentService.ts) since the service imports the mapper function
- The `LinkAnalysisRequest.retrievedPages` field already uses the correct name in `types.ts` — no change needed there
- `BatchReviewRequest` and `BatchReviewResult` in `types.ts` can be left or removed; they are no longer referenced after removing `reviewPageBatch`
- The `selectRelevantPagesTool` and `pageSelectionInstructions` in `OpenRouterProvider.ts` are dead code from the old architecture and should be removed in 3.3
- After task 3.7, if `AgentLoop.ts` is referenced anywhere, TypeScript will produce a new error — always check imports before deleting
