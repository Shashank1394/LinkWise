# Bugfix Requirements Document

## Introduction

After renaming files from `GetCandidatePages` to `GetRelevantPages`, the project accumulated a set of TypeScript errors and structural inconsistencies that prevent the application from compiling. The issues span stale import paths, mismatched tool names, a missing type export (`CandidatePage`), a variable reference error, a schema/interface inconsistency (`pageIdsToRead` vs `pagesToRead`), an interface/implementation mismatch on `AiProvider`, and an empty `AgentLoop.ts` that is unused.

The user also wants to simplify the architecture: remove the batch-review complexity (`reviewPageBatch` / `BatchReviewRequest` / `BatchReviewResult`) and adopt a straightforward tool-based agent loop where the LLM calls registered tools directly. The end state should be a project that compiles cleanly and uses a simple tool-calling flow.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `LinkRecommendationAgent.ts` is compiled THEN the system fails with an error because it imports `GetRelevantPagesTool` from a file that does not exist (`../agent/tools/GetRelevantPagesTool`), while the real file is `FindRelevantPagesTool.ts` with class `FindRelevantPagesTool`.

1.2 WHEN `LinkRecommendationAgent.ts` calls `this.toolRegistry.get<GetRelevantPagesTool>("get_relevant_pages")` THEN the system fails at compile time and at runtime because the registered tool name is `"find_relevant_pages"` and the type is `FindRelevantPagesTool`.

1.3 WHEN the `run` method of `LinkRecommendationAgent` returns `{ runId, relevantPages: relevantPages, opportunities }` THEN the system fails with a compile error because the variable `relevantPages` is not defined in that scope; the correct variable is `candidatePages`.

1.4 WHEN `OpenRouterProvider.submitLinkRecommendations` accesses `request.candidatePages` THEN the system fails at compile time because `LinkAnalysisRequest` only has `retrievedPages`, not `candidatePages`.

1.5 WHEN `SitecoreContentService` imports `CandidatePage` from `../recommendations/types` THEN the system fails at compile time because `types.ts` does not export `CandidatePage` (it was removed during the rename).

1.6 WHEN `PageMapper.ts` imports `CandidatePage` from `../../lib/recommendations/types` THEN the system fails at compile time for the same reason as 1.5.

1.7 WHEN `BatchReviewResultSchema` in `schemas.ts` is used to parse a value THEN the system fails at runtime because the schema field is `pageIdsToRead` (an array of strings) while the `BatchReviewResult` interface uses `pagesToRead` (an array of `{ id, reason }` objects), making them structurally incompatible.

1.8 WHEN code references `AiProvider.planSearchQueries` THEN the system fails at compile time because `OpenRouterProvider` does not implement that method; it implements `requestCandidateSearch` instead.

1.9 WHEN `AgentLoop.ts` is imported or referenced THEN the system provides no usable implementation because the file is empty.

### Expected Behavior (Correct)

2.1 WHEN `LinkRecommendationAgent.ts` is compiled THEN the system SHALL resolve `FindRelevantPagesTool` from the correct file `../agent/tools/FindRelevantPagesTool`.

2.2 WHEN `LinkRecommendationAgent.ts` retrieves the tool from the registry THEN the system SHALL use tool name `"find_relevant_pages"` and type `FindRelevantPagesTool`.

2.3 WHEN the `run` method of `LinkRecommendationAgent` returns its result THEN the system SHALL reference the correctly named local variable (`candidatePages`) for the `relevantPages` return field.

2.4 WHEN `OpenRouterProvider.submitLinkRecommendations` reads page data from the request THEN the system SHALL access `request.retrievedPages` (the field that exists on `LinkAnalysisRequest`).

2.5 WHEN `SitecoreContentService` needs a page type for search results THEN the system SHALL use `RelevantPage` (or an equivalent locally defined type), removing all references to the deleted `CandidatePage` type.

2.6 WHEN `PageMapper.ts` maps a `PageSearchResult` THEN the system SHALL return a `RelevantPage` and import the correct type.

2.7 WHEN `BatchReviewResultSchema` parses a value THEN the system SHALL use a schema that is consistent with the `BatchReviewResult` interface, with `pagesToRead` as an array of `{ id: string; reason: string }` objects.

2.8 WHEN the `AiProvider` interface is compiled THEN the system SHALL declare only the methods that `OpenRouterProvider` actually implements (`requestCandidateSearch` and `submitLinkRecommendations`), removing `planSearchQueries` and `reviewPageBatch` (or aligning the interface to match the implementation).

2.9 WHEN the architecture is simplified to a tool-based agent THEN `AgentLoop.ts` SHALL either be implemented to support a basic tool-calling loop or be removed; the project SHALL NOT contain an empty exported module.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user triggers link analysis for a Sitecore page THEN the system SHALL CONTINUE TO call `requestCandidateSearch` to generate search queries, retrieve candidate pages via `FindRelevantPagesTool`, and return `LinkOpportunity[]` results.

3.2 WHEN `submitLinkRecommendations` is called with a `LinkAnalysisRequest` containing `currentPage` and `retrievedPages` THEN the system SHALL CONTINUE TO send those pages to the LLM and return an array of `LinkOpportunity` objects.

3.3 WHEN `SitecoreRelevantPageProvider.getRelevantPages` is called THEN the system SHALL CONTINUE TO search candidate pages, deduplicate results, and return a `RelevantPage[]`.

3.4 WHEN `LinkAnalysisService.analyze` is called THEN the system SHALL CONTINUE TO fetch page content, run the agent, validate opportunities, and return the final `LinkOpportunity[]`.

3.5 WHEN a link is approved via `insertApprovedLink` THEN the system SHALL CONTINUE TO locate the source rich-text field and update it in Sitecore.

3.6 WHEN `GetPageContentTool` is invoked THEN the system SHALL CONTINUE TO retrieve plain-text content for the requested page IDs.
