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

export interface LinkAnalysisRequest {
  currentPage: CurrentPage;
  retrievedPages: RetrievedPage[];
}

export interface LinkAnalysisResponse {
  opportunities: LinkOpportunity[];
}

export interface BatchReviewResult {
  pagesToRead: Array<{
    id: string;
    reason: string;
  }>;

  continueSearching: boolean;

  confidence: number;

  reasoning: string;
}

export interface BatchReviewRequest {
  currentPage: CurrentPage;
  pages: RelevantPage[];
}
