"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CurrentPageCard } from "@/src/components/current-page/CurrentPageCard";
import SuggestedLinksCard from "@/src/components/suggestions/SuggestedLinksCard";
import { useCurrentPage } from "@/src/utils/hooks/useCurrentPage";
import type { LinkOpportunity } from "@/src/lib/types";

interface LinkOpportunitiesResponse {
  success: boolean;
  opportunities?: LinkOpportunity[];
  error?: string;
}

export default function PagesContextPanel() {
  const { page, site, loading: pageLoading, error: pageError } = useCurrentPage();
  const [opportunities, setOpportunities] = useState<LinkOpportunity[]>([]);
  const [analysisError, setAnalysisError] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisRequest = useMemo(() => {
    const title = page?.displayName ?? page?.name;

    if (!page?.id || !title || !page.path || !page.language || !site?.name) {
      return undefined;
    }

    return {
      id: page.id,
      title,
      path: page.path,
      language: page.language,
      siteName: site.name,
    };
  }, [page?.displayName, page?.id, page?.language, page?.name, page?.path, site?.name]);

  const approveOpportunity = useCallback(
    async (opportunity: LinkOpportunity) => {
      if (!analysisRequest) {
        throw new Error("The current page is not ready to update.");
      }

      const response = await fetch("/api/link-opportunities/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: analysisRequest, opportunity }),
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to add the link.");
      }
    },
    [analysisRequest],
  );

  useEffect(() => {
    if (!analysisRequest) {
      return;
    }

    const controller = new AbortController();

    async function analyzePage() {
      setIsAnalyzing(true);
      setAnalysisError(undefined);
      setOpportunities([]);

      try {
        const response = await fetch("/api/link-opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analysisRequest),
          signal: controller.signal,
        });
        const result = (await response.json()) as LinkOpportunitiesResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Unable to analyze this page.");
        }

        setOpportunities(result.opportunities ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAnalysisError(
          error instanceof Error ? error.message : "Unable to analyze this page.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsAnalyzing(false);
        }
      }
    }

    void analyzePage();

    return () => controller.abort();
  }, [analysisRequest]);

  return (
    <div className="space-y-6">
      <CurrentPageCard page={page} loading={pageLoading} error={pageError} />

      <SuggestedLinksCard
        opportunities={opportunities}
        loading={isAnalyzing}
        error={analysisError}
        onApprove={approveOpportunity}
      />
    </div>
  );
}
