"use client";

import { useEffect, useState } from "react";
import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient } from "./useMarketplaceClient";

export interface UseCurrentPageResult {
  page?: PagesContext["pageInfo"];
  site?: PagesContext["siteInfo"];
  context?: PagesContext;
  loading: boolean;
  error: unknown;
}

export function useCurrentPage(): UseCurrentPageResult {
  const { client, isInitialized, error: clientError } = useMarketplaceClient();

  const [context, setContext] = useState<PagesContext>();
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<unknown>(null);

  useEffect(() => {
    if (!client || !isInitialized) {
      return;
    }

    let isMounted = true;

    client
      .query("pages.context", {
        subscribe: true,
        onSuccess: (pagesContext) => {
          if (!isMounted) return;

          setContext(pagesContext);
          setLoading(false);
        },
      })
      .catch((err) => {
        if (!isMounted) return;

        console.error("Failed to retrieve pages.context", err);
        setQueryError(err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [client, isInitialized]);

  return {
    page: context?.pageInfo,
    site: context?.siteInfo,
    context,
    loading: loading || !isInitialized,
    error: clientError ?? queryError,
  };
}
