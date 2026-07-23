import { AgentApiClient } from "./AgentApiClient";
import { mapToCandidatePage } from "./PageMapper";

export class SitecoreContentService {
  constructor(private client = new AgentApiClient()) {}

  async searchCandidatePages(siteName: string, query: string) {
    const results = await this.client.searchPages(siteName, query);

    return results.map(mapToCandidatePage);
  }
}
