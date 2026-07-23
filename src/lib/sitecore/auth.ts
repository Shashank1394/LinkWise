import { JwtResponse } from "./types";

let cachedToken: string | null = null;
let expiresAt = 0;

/**
 * Returns a valid JWT for the Sitecore Agent API.
 * The token is cached until shortly before it expires.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Reuse cached token if still valid
  if (cachedToken && now < expiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SITECORE_CLIENT_ID;
  const clientSecret = process.env.SITECORE_CLIENT_SECRET;
  const authUrl = process.env.SITECORE_AUTH_URL;

  if (!clientId || !clientSecret || !authUrl) {
    throw new Error("Missing Sitecore authentication environment variables.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    audience: "https://api.sitecorecloud.io",
  });

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Sitecore authentication failed (${response.status}): ${error}`,
    );
  }

  const token: JwtResponse = await response.json();
  console.log(token);

  cachedToken = token.access_token;

  // Refresh 60 seconds before expiry
  expiresAt = Date.now() + (token.expires_in - 60) * 1000;

  return cachedToken;
}
