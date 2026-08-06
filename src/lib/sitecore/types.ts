export interface JwtResponse {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
}

export interface Site {
  id: string;
  name: string;
  targetHostname: string;
  rootPath: string;
}

export interface SitesResponse {
  sites: Site[];
}

export interface PageSearchField {
  name: string;
  value: string;
}

export interface PageSearchResult {
  itemId: string;
  name: string;
  path: string;
  templateId: string;
  fields: PageSearchField[];
}

export interface ContentItem {
  itemId: string;
  name: string;
  path: string;
  fields?: Record<string, unknown> | null;
}

export interface UpdateContentResponse {
  itemId: string;
  name: string;
  path: string;
  updatedFields: Record<string, unknown>;
}

export interface PageComponent {
  id: string;
  componentId: string;
  componentName: string;
  dataSource?: string | null;
}

export interface PageComponentsResponse {
  pageId: string;
  components?: PageComponent[] | null;
}

export interface SitePage {
  id: string;
  path: string;
}

export interface ComponentDefinition {
  datasourceFields: Array<{
    name: string;
    type: string;
  }>;
}
