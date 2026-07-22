export interface PageReference {
  id: string;
  title: string;
  path: string;
}

export interface CurrentPage {
  id: string;
  title: string;
  path: string;
  language: string;
  plainTextContent?: string;
}

export interface CandidatePage extends PageReference {
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
  candidatePages: CandidatePage[];
}

export interface LinkAnalysisResponse {
  opportunities: LinkOpportunity[];
}
