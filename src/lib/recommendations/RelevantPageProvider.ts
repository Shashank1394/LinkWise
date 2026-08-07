import { CurrentPage, RelevantPage } from "./types";

/**
 * Provides lightweight page summaries that can be used by the agent to
 * decide which pages are worth inspecting in detail.
 */
export interface RelevantPageProvider {
  getRelevantPages(
    currentPage: CurrentPage,
    searchQueries: string[],
  ): Promise<RelevantPage[]>;
}
