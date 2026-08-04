import { CandidatePage, CurrentPage } from "./types";

export interface CandidatePageProvider {
  getCandidates(
    currentPage: CurrentPage,
    searchQueries: string[],
  ): Promise<CandidatePage[]>;
}
