export interface PageReference {
  id: string;
  title: string;
  path: string;
  description?: string;
  content?: string;
}

export interface RelevantPage extends PageReference {}

export interface RetrievedPage extends RelevantPage {
  plainTextContent?: string;
}

export interface CurrentPage {
  id: string;
  title: string;
  path: string;
  language: string;
  siteName: string;
  plainTextContent?: string;
}

export interface LinkOpportunity {
  sourceText: string;
  anchorText: string;
  destination: PageReference;
  score: number;
  reason: string;
  seoBenefit: string;
}

/**
 * Provides lightweight page summaries for the agent to discover link targets.
 */
export interface RelevantPageProvider {
  getRelevantPages(
    currentPage: CurrentPage,
    searchQueries: string[],
  ): Promise<RelevantPage[]>;
}
