export interface JwtResponse {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
}

export interface Site {
  id: string;
  name: string;
  displayName: string;
  url: string;
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
