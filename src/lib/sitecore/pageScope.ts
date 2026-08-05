import { CandidatePage } from "../recommendations/types";

const configuredPageRoot = process.env.SITECORE_PAGE_ROOT;

if (!configuredPageRoot) {
  throw new Error("Missing SITECORE_PAGE_ROOT environment variable.");
}

const allowedPageRoot = normalizePath(configuredPageRoot);
const dataSourceSegment = /\/(data|datasource|datasources)(?:\/|$)/i;

export function isAllowedDestinationPage(page: CandidatePage): boolean {
  const path = normalizePath(page.path);

  return (
    (path === allowedPageRoot || path.startsWith(`${allowedPageRoot}/`)) &&
    !dataSourceSegment.test(path)
  );
}

function normalizePath(path: string): string {
  return `/${path.trim().replace(/^\/+|\/+$/g, "")}`.toLowerCase();
}
