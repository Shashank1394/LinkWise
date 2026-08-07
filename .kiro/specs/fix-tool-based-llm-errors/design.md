# Fix Tool-Based LLM Errors Bugfix Design

## Overview

This bugfix addresses a collection of TypeScript compile errors and architectural inconsistencies introduced after renaming from `GetCandidatePages` to `GetRelevantPages`. The bugs include stale imports, mismatched tool names, a missing `CandidatePage` type, variable reference errors, schema/interface misalignments, and an unimplemented `AgentLoop.ts` module.

The fix also simplifies the architecture by removing batch-review complexity (reviewPageBatch, BatchReviewRequest, BatchReviewResult) and adopting a direct tool-calling pattern where the LLM invokes registered tools via the agent framework. The end result is a project that compiles cleanly with a streamlined, tool-based agent workflow.

## Glossary

- **Bug_Condition (C)**: The condition that triggers TypeScript compile errors and runtime failures - when any of the affected files (`LinkRecommendationAgent.ts`, `OpenRouterProvider.ts`, `SitecoreContentService.ts`, `PageMapper.ts`, `AiProvider` interface, `schemas.ts`, `AgentLoop.ts`) are compiled or imported
- **Property (P)**: The desired behavior - all TypeScript files compile without errors and the tool-based agent executes successfully using the correct imports, types, and tool names
- **Preservation**: Existing core functionality that must remain unchanged - link analysis flow, search query generation, page retrieval via tools, link opportunity generation, and link insertion
- **LinkRecommendationAgent**: The agent orchestrator in `src/lib/recommendations/LinkRecommendationAgent.ts` that coordinates the link analysis workflow
- **FindRelevantPagesTool**: The registered tool in `src/lib/agent/tools/FindRelevantPagesTool.ts` with name `"find_relevant_pages"` that retrieves candidate pages
- **CandidatePage**: A deleted type that was replaced by `RelevantPage` during the rename but still referenced in multiple files
- **LinkAnalysisRequest**: The request type in `src/lib/recommendations/types.ts` that contains `currentPage` and `retrievedPages` (not `candidatePages`)
- **AiProvider**: The interface in `src/lib/ai/provider.ts` that should declare the methods actually implemented by `OpenRouterProvider`

## Bug Details

### Bug Condition

The bug manifests when TypeScript attempts to compile files that contain stale imports, deleted type references, incorrect variable names, mismatched tool names, schema/interface inconsistencies, or when code references unimplemented methods. The affected components span multiple layers: agent orchestration (`LinkRecommendationAgent.ts`), AI provider implementation (`OpenRouterProvider.ts`, `provider.ts`), Sitecore integration (`SitecoreContentService.ts`, `PageMapper.ts`), validation schemas (`schemas.ts`), and the agent framework (`AgentLoop.ts`).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type CompilationContext
  OUTPUT: boolean
  
  RETURN (input.file == "LinkRecommendationAgent.ts" 
            AND (input.imports CONTAINS "GetRelevantPagesTool" 
                 OR input.toolName == "get_relevant_pages" 
                 OR input.returnVariable == "relevantPages"))
         OR (input.file == "OpenRouterProvider.ts" 
            AND input.accessPath == "request.candidatePages")
         OR (input.file == "SitecoreContentService.ts" 
            AND input.importedType == "CandidatePage")
         OR (input.file == "PageMapper.ts" 
            AND input.returnType == "CandidatePage")
         OR (input.file == "provider.ts" 
            AND input.interfaceMethod IN ["planSearchQueries", "reviewPageBatch"])
         OR (input.file == "schemas.ts" 
            AND input.schemaField == "pageIdsToRead")
         OR (input.file == "AgentLoop.ts" 
            AND input.exportedContent == EMPTY)
END FUNCTION
```

### Examples

- **Import Error**: `import { GetRelevantPagesTool } from "../agent/tools/GetRelevantPagesTool"` in `LinkRecommendationAgent.ts` fails because the file is named `FindRelevantPagesTool.ts` and exports `FindRelevantPagesTool`
  - **Expected**: `import { FindRelevantPagesTool } from "../agent/tools/FindRelevantPagesTool"`
  - **Actual**: TypeScript error: "Cannot find module '../agent/tools/GetRelevantPagesTool'"

- **Tool Name Mismatch**: `this.toolRegistry.get<GetRelevantPagesTool>("get_relevant_pages")` fails because the registered tool name is `"find_relevant_pages"`
  - **Expected**: `this.toolRegistry.get<FindRelevantPagesTool>("find_relevant_pages")`
  - **Actual**: Runtime error: Tool not found, TypeScript type error

- **Variable Reference Error**: `return { runId, relevantPages: relevantPages, opportunities }` fails because `relevantPages` is undefined; the local variable is `candidatePages`
  - **Expected**: `return { runId, relevantPages: candidatePages, opportunities }`
  - **Actual**: TypeScript error: "Cannot find name 'relevantPages'"

- **Property Access Error**: `request.candidatePages` in `OpenRouterProvider.submitLinkRecommendations` fails because `LinkAnalysisRequest` has `retrievedPages`
  - **Expected**: `request.retrievedPages`
  - **Actual**: TypeScript error: "Property 'candidatePages' does not exist on type 'LinkAnalysisRequest'"

- **Missing Type Export**: `import { CandidatePage } from "../recommendations/types"` in `SitecoreContentService.ts` and `PageMapper.ts` fails because `CandidatePage` was deleted
  - **Expected**: `import { RelevantPage } from "../recommendations/types"` and use `RelevantPage` throughout
  - **Actual**: TypeScript error: "Module has no exported member 'CandidatePage'"

- **Schema/Interface Mismatch**: `BatchReviewResultSchema` uses `pageIdsToRead: z.array(z.string())` but `BatchReviewResult` interface has `pagesToRead: Array<{ id: string; reason: string }>`
  - **Expected**: Schema should match interface structure OR both should be removed (simplified architecture)
  - **Actual**: Runtime parsing error when schema validation fails

- **Interface/Implementation Mismatch**: `AiProvider` interface declares `planSearchQueries` and `reviewPageBatch` but `OpenRouterProvider` implements `requestCandidateSearch` and `reviewPageBatch`
  - **Expected**: Interface should declare only `requestCandidateSearch` and `submitLinkRecommendations` (batch review removed)
  - **Actual**: TypeScript error: "Class 'OpenRouterProvider' incorrectly implements interface 'AiProvider'"

- **Empty Module**: `AgentLoop.ts` is empty but may be imported
  - **Expected**: Either implement the agent loop or delete the file
  - **Actual**: No exports, potential import errors if referenced

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Link analysis workflow must continue to work: fetch page content, generate search queries, retrieve candidates, analyze links, return opportunities
- `FindRelevantPagesTool` must continue to retrieve candidate pages using search queries
- `GetPageContentTool` must continue to retrieve plain-text content for page IDs
- `SitecoreRelevantPageProvider.getRelevantPages` must continue to search, deduplicate, and return relevant pages
- `LinkAnalysisService.analyze` must continue to orchestrate the full workflow and return validated opportunities
- `SitecoreContentService.insertApprovedLink` must continue to locate source text and update Sitecore content
- `OpenRouterProvider.requestCandidateSearch` must continue to generate search queries using the LLM
- `OpenRouterProvider.submitLinkRecommendations` must continue to analyze candidates and return link opportunities

**Scope:**
All inputs that do NOT involve the buggy files or the simplified architecture changes should be completely unaffected by this fix. This includes:
- API routes (`/api/link-opportunities`, `/api/sitecore/search`, etc.)
- UI components (CurrentPageCard, SuggestedLinksCard, etc.)
- Sitecore API client (`AgentApiClient`)
- Tool registry and tool base classes
- Schema validation for link opportunities and content search queries

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Incomplete Rename Refactor**: The rename from `GetCandidatePages` to `GetRelevantPages` was not applied consistently across all import statements and tool name references in `LinkRecommendationAgent.ts`
   - Import still references old class name
   - Tool lookup still uses old tool name

2. **Type Deletion Without Replacement**: The `CandidatePage` type was removed from `types.ts` during the rename, but usages in `SitecoreContentService.ts` and `PageMapper.ts` were not updated to use `RelevantPage`

3. **Copy-Paste Variable Error**: The return statement in `LinkRecommendationAgent.run` references `relevantPages` (the return field name) instead of `candidatePages` (the local variable)

4. **Property Rename Not Propagated**: `LinkAnalysisRequest.candidatePages` was renamed to `retrievedPages` in the interface, but `OpenRouterProvider.submitLinkRecommendations` was not updated to access the new property name

5. **Schema Created Before Interface**: `BatchReviewResultSchema` was created with `pageIdsToRead` (simple array) but the interface was later changed to `pagesToRead` (array of objects) without updating the schema

6. **Interface Not Updated After Refactor**: The `AiProvider` interface still declares old method names (`planSearchQueries`) and methods from the old batch-review architecture (`reviewPageBatch`) while `OpenRouterProvider` implements the new simplified methods

7. **Incomplete Feature Removal**: The batch-review complexity (BatchReviewRequest, BatchReviewResult, reviewPageBatch, reviewPageBatchTool) was partially removed but artifacts remain in the codebase

8. **Empty Stub File**: `AgentLoop.ts` was created as a placeholder for future agent loop implementation but never completed or removed

## Correctness Properties

Property 1: Bug Condition - TypeScript Compilation Success

_For any_ file that was previously failing TypeScript compilation due to stale imports (`GetRelevantPagesTool`), incorrect tool names (`get_relevant_pages`), undefined variables (`relevantPages`), missing types (`CandidatePage`), incorrect property access (`candidatePages`), interface mismatches (`planSearchQueries`, `reviewPageBatch`), schema inconsistencies (`pageIdsToRead`), or empty modules (`AgentLoop.ts`), the fixed code SHALL compile without errors and correctly reference `FindRelevantPagesTool`, tool name `find_relevant_pages`, variable `candidatePages`, type `RelevantPage`, property `retrievedPages`, interface methods `requestCandidateSearch` and `submitLinkRecommendations`, and either implement or remove `AgentLoop.ts`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

Property 2: Preservation - Link Analysis Workflow

_For any_ link analysis request that does NOT depend on the batch-review architecture (which is being removed), the fixed code SHALL produce the same functional behavior as the original code, preserving the complete workflow: page content retrieval, search query generation via `requestCandidateSearch`, candidate page retrieval via `FindRelevantPagesTool`, link opportunity analysis via `submitLinkRecommendations`, validation, and return of `LinkOpportunity[]` results.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/lib/recommendations/LinkRecommendationAgent.ts`

**Function**: `LinkRecommendationAgent.run`

**Specific Changes**:
1. **Fix Import Statement**: Change `import { GetRelevantPagesTool } from "../agent/tools/GetRelevantPagesTool"` to `import { FindRelevantPagesTool } from "../agent/tools/FindRelevantPagesTool"`
   - Update the imported class name from `GetRelevantPagesTool` to `FindRelevantPagesTool`

2. **Fix Tool Registry Lookup**: Change `this.toolRegistry.get<GetRelevantPagesTool>("get_relevant_pages")` to `this.toolRegistry.get<FindRelevantPagesTool>("find_relevant_pages")`
   - Update the type parameter from `GetRelevantPagesTool` to `FindRelevantPagesTool`
   - Update the tool name from `"get_relevant_pages"` to `"find_relevant_pages"`

3. **Fix Tool Name in Error Message**: Change `'Tool "get_relevant_pages" is not registered.'` to `'Tool "find_relevant_pages" is not registered.'`

4. **Fix Return Statement Variable Reference**: Change `return { runId, relevantPages: relevantPages, opportunities }` to `return { runId, relevantPages: candidatePages, opportunities }`
   - Update the field value from undefined variable `relevantPages` to the correct local variable `candidatePages`

**File**: `src/lib/ai/OpenRouterProvider.ts`

**Function**: `OpenRouterProvider.submitLinkRecommendations`

**Specific Changes**:
1. **Fix Property Access**: Change `candidatePages: request.candidatePages.map(...)` to `candidatePages: request.retrievedPages.map(...)`
   - Update the accessed property from `candidatePages` (which doesn't exist) to `retrievedPages` (which exists on `LinkAnalysisRequest`)

2. **Remove Batch Review Method**: Delete the `reviewPageBatch` method and the `reviewPageBatchTool` tool definition
   - Remove the `reviewPageBatch` async method
   - Remove the `reviewPageBatchTool: ChatCompletionTool` constant
   - Remove the `pageBatchReviewInstructions` string constant
   - Remove the `BatchReviewRequest` and `BatchReviewResult` imports

3. **Remove Unused Tool Definitions**: Delete `selectRelevantPagesTool` and `pageSelectionInstructions`
   - These were part of the old batch-review architecture

**File**: `src/lib/sitecore/SitecoreContentService.ts`

**Function**: Multiple methods

**Specific Changes**:
1. **Remove CandidatePage Import**: Change `import { CandidatePage, CurrentPage, LinkOpportunity } from "../recommendations/types"` to `import { RelevantPage, CurrentPage, LinkOpportunity } from "../recommendations/types"`
   - Remove `CandidatePage` from the import list
   - Add `RelevantPage` to the import list

2. **Update Return Type**: Change `searchCandidatePages` return type from implicit `CandidatePage[]` to explicit `RelevantPage[]`
   - The method already returns the result of `mapToCandidatePage`, which will be renamed to `mapToRelevantPage`

3. **Update Return Type**: Change `getContentTreeCandidates` return type from `Promise<CandidatePage[]>` to `Promise<RelevantPage[]>`

**File**: `src/lib/sitecore/PageMapper.ts`

**Function**: `mapToCandidatePage`

**Specific Changes**:
1. **Update Import**: Change `import { CandidatePage } from "../../lib/recommendations/types"` to `import { RelevantPage } from "../../lib/recommendations/types"`

2. **Rename Function**: Rename `mapToCandidatePage` to `mapToRelevantPage`
   - Update the function name
   - Update all references to this function in `SitecoreContentService.ts`

3. **Update Return Type**: Change return type from `CandidatePage` to `RelevantPage`

**File**: `src/lib/ai/provider.ts`

**Interface**: `AiProvider`

**Specific Changes**:
1. **Remove Old Method Declaration**: Delete `planSearchQueries(currentPage: CurrentPage): Promise<string[]>`
   - This method is not implemented by `OpenRouterProvider`

2. **Add New Method Declaration**: Add `requestCandidateSearch(currentPage: CurrentPage): Promise<string[]>`
   - This is the method actually implemented by `OpenRouterProvider`

3. **Remove Batch Review Method**: Delete `reviewPageBatch(request: BatchReviewRequest): Promise<BatchReviewResult>`
   - This method is part of the batch-review architecture being removed

4. **Remove Batch Review Imports**: Remove `BatchReviewRequest` and `BatchReviewResult` from imports if no longer used

**File**: `src/lib/ai/schemas.ts`

**Const**: `BatchReviewResultSchema`

**Specific Changes**:
1. **Remove Entire Schema**: Delete `BatchReviewResultSchema` entirely
   - Since batch review is being removed, the schema is no longer needed
   - This also resolves the schema/interface mismatch (pageIdsToRead vs pagesToRead)

**File**: `src/lib/agent/AgentLoop.ts`

**Module**: Entire file

**Specific Changes**:
1. **Delete File**: Remove `src/lib/agent/AgentLoop.ts` entirely
   - The file is empty and not used
   - No imports reference this file
   - If future agent loop implementation is needed, it can be recreated

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm that all identified TypeScript errors are present on the unfixed code by running the TypeScript compiler, then verify that the fixed code compiles successfully and preserves all existing functionality through unit tests, integration tests, and manual verification of the link analysis workflow.

### Exploratory Bug Condition Checking

**Goal**: Surface TypeScript compile errors that demonstrate the bugs BEFORE implementing the fix. Confirm the root cause analysis by observing each specific error message. If compilation succeeds unexpectedly, re-hypothesize.

**Test Plan**: Run `tsc --noEmit` or `npm run build` on the UNFIXED code and capture the TypeScript error output. Verify that each expected error is present.

**Test Cases**:
1. **Import Error Test**: Verify TypeScript reports "Cannot find module '../agent/tools/GetRelevantPagesTool'" in `LinkRecommendationAgent.ts` (will fail on unfixed code)
2. **Type Error Test**: Verify TypeScript reports type mismatch for `GetRelevantPagesTool` vs `FindRelevantPagesTool` (will fail on unfixed code)
3. **Variable Reference Error Test**: Verify TypeScript reports "Cannot find name 'relevantPages'" in return statement (will fail on unfixed code)
4. **Property Access Error Test**: Verify TypeScript reports "Property 'candidatePages' does not exist on type 'LinkAnalysisRequest'" (will fail on unfixed code)
5. **Missing Export Error Test**: Verify TypeScript reports "Module has no exported member 'CandidatePage'" in `SitecoreContentService.ts` and `PageMapper.ts` (will fail on unfixed code)
6. **Interface Implementation Error Test**: Verify TypeScript reports "Class 'OpenRouterProvider' incorrectly implements interface 'AiProvider'" (will fail on unfixed code)
7. **Schema Field Test**: Inspect `BatchReviewResultSchema` and confirm it uses `pageIdsToRead` while interface uses `pagesToRead` (structural mismatch)
8. **Empty Module Test**: Verify `AgentLoop.ts` has no exports (may fail on unfixed code if imported)

**Expected Counterexamples**:
- TypeScript compilation fails with 6+ errors
- Errors span import resolution, type mismatches, undefined variables, missing properties, missing exports, and interface implementation
- Possible additional errors: transitive compilation failures in files that import the broken modules

### Fix Checking

**Goal**: Verify that for all files where the bug condition holds (compilation errors exist), the fixed code produces the expected behavior (successful compilation and correct runtime execution).

**Pseudocode:**
```
FOR ALL file WHERE isBugCondition(file) DO
  result := compileTypeScript(file_fixed)
  ASSERT result.success == true
  ASSERT result.errors.length == 0
END FOR

FOR ALL workflow IN [linkAnalysis, pageRetrieval, opportunityGeneration] DO
  result := executeWorkflow(workflow)
  ASSERT result.success == true
  ASSERT result.output matches expected schema
END FOR
```

### Preservation Checking

**Goal**: Verify that for all workflows where the bug condition does NOT hold (workflows not dependent on batch review or buggy code paths), the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL workflow WHERE NOT dependsOnBatchReview(workflow) DO
  ASSERT executeWorkflow_fixed(workflow) == executeWorkflow_original(workflow)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different pages, queries, candidates)
- It catches edge cases that manual unit tests might miss (empty results, large result sets, special characters)
- It provides strong guarantees that behavior is unchanged for all non-buggy code paths

**Test Plan**: Observe behavior on UNFIXED code first for successful workflows (workflows that don't hit the compile errors), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Search Query Generation Preservation**: Observe that `requestCandidateSearch` generates valid queries on unfixed code (if it doesn't hit compile errors), then write test to verify this continues after fix
2. **Page Retrieval Preservation**: Observe that `FindRelevantPagesTool` retrieves and deduplicates pages on unfixed code, then write test to verify this continues after fix
3. **Link Opportunity Generation Preservation**: Observe that `submitLinkRecommendations` analyzes candidates and returns opportunities on unfixed code, then write test to verify this continues after fix
4. **Link Insertion Preservation**: Observe that `insertApprovedLink` locates source text and updates Sitecore on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that `LinkRecommendationAgent` correctly imports `FindRelevantPagesTool` and retrieves it from the registry with tool name `"find_relevant_pages"`
- Test that `LinkRecommendationAgent.run` returns a result with `relevantPages` field populated from `candidatePages` variable
- Test that `OpenRouterProvider.submitLinkRecommendations` correctly accesses `request.retrievedPages`
- Test that `SitecoreContentService.searchCandidatePages` returns `RelevantPage[]`
- Test that `PageMapper.mapToRelevantPage` returns a correctly mapped `RelevantPage`
- Test that `AiProvider` interface is correctly implemented by `OpenRouterProvider` with only `requestCandidateSearch` and `submitLinkRecommendations` methods

### Property-Based Tests

- Generate random `CurrentPage` inputs and verify `requestCandidateSearch` produces valid query arrays (min 1, max 8 queries)
- Generate random search queries and verify `FindRelevantPagesTool` returns deduplicated `RelevantPage[]` excluding current page
- Generate random `LinkAnalysisRequest` inputs with varying numbers of `retrievedPages` and verify `submitLinkRecommendations` returns valid `LinkOpportunity[]` (max 8 opportunities)
- Generate random page content and verify `getPagePlainText` produces non-empty strings for valid pages

### Integration Tests

- Test full link analysis workflow: create `CurrentPage`, call `LinkAnalysisService.analyze`, verify it returns `LinkOpportunity[]`
- Test tool registry integration: verify `createToolRegistry` registers `FindRelevantPagesTool` with name `"find_relevant_pages"` and tool is retrievable
- Test that TypeScript compilation succeeds for all fixed files (`tsc --noEmit` returns exit code 0)
- Test that ESLint passes for all fixed files (no new linting errors introduced)
- Test that the application starts successfully (`npm run dev` starts without errors)
