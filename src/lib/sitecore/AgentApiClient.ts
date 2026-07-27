import { getAccessToken } from "./auth";
import {
  ContentItem,
  ComponentDefinition,
  PageComponentsResponse,
  PageSearchResult,
  Site,
  UpdateContentResponse,
} from "./types";

interface PageHtmlResponse {
  pageId: string;
  html: string;
}

export class AgentApiClient {
  private readonly baseUrl: string;

  constructor() {
    const baseUrl = process.env.SITECORE_AGENT_API;

    if (!baseUrl) {
      throw new Error("Missing SITECORE_AGENT_API environment variable.");
    }

    this.baseUrl = baseUrl;
  }

  /**
   * Generic request helper for the Sitecore Agent API.
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(
        `Agent API request failed (${response.status}): ${error}`,
      );
    }

    // Handle endpoints that return no content (204)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * GET /api/v1/sites
   * Retrieves all available sites.
   */
  async getSites(): Promise<Site[]> {
    return this.request<Site[]>("/api/v1/sites");
  }

  /**
   * Generic GET helper
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: "GET",
    });
  }

  /**
   * Generic POST helper
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Generic PUT helper
   */
  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Generic DELETE helper
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
    });
  }

  async searchPages(
    siteName: string,
    searchQuery: string,
    language = "en",
  ): Promise<PageSearchResult[]> {
    const params = new URLSearchParams({
      site_name: siteName,
      search_query: searchQuery,
      language,
    });

    return this.get<PageSearchResult[]>(
      `/api/v1/pages/search?${params.toString()}`,
    );
  }

  /**
   * GET /api/v1/pages/{pageId}/html
   * Retrieves the rendered HTML for a page in the selected language.
   */
  async getPageHtml(pageId: string, language = "en"): Promise<string> {
    const params = new URLSearchParams({ language });
    const page = await this.get<PageHtmlResponse>(
      `/api/v1/pages/${encodeURIComponent(pageId)}/html?${params.toString()}`,
    );

    return page.html;
  }

  async getContentItem(pageId: string, language: string): Promise<ContentItem> {
    const params = new URLSearchParams({ language });

    return this.get<ContentItem>(
      `/api/v1/content/${encodeURIComponent(pageId)}?${params.toString()}`,
    );
  }

  async getPageComponents(
    pageId: string,
    language: string,
  ): Promise<PageComponentsResponse> {
    const params = new URLSearchParams({ language });

    return this.get<PageComponentsResponse>(
      `/api/v1/pages/${encodeURIComponent(pageId)}/components?${params.toString()}`,
    );
  }

  async getComponent(componentId: string): Promise<ComponentDefinition> {
    return this.get<ComponentDefinition>(
      `/api/v1/components/${encodeURIComponent(componentId)}`,
    );
  }

  async updateContentItem(
    pageId: string,
    fields: Record<string, unknown>,
    language: string,
    siteName: string,
  ): Promise<UpdateContentResponse> {
    return this.put<UpdateContentResponse>(
      `/api/v1/content/${encodeURIComponent(pageId)}`,
      {
        fields,
        language,
        siteName,
        createNewVersion: true,
      },
    );
  }
}
