"use client";

import { CurrentPageCard } from "@/src/components/current-page/CurrentPageCard";
import SuggestedLinksCard from "@/src/components/suggestions/SuggestedLinksCard";

import { useCurrentPage } from "@/src/utils/hooks/useCurrentPage";

import { mockLinkOpportunities } from "@/src/data/mock-link-opportunities";

export default function PagesContextPanel() {
  const { page, loading, error } = useCurrentPage();

  return (
    <div className="space-y-6">
      <CurrentPageCard page={page} loading={loading} error={error} />

      <SuggestedLinksCard opportunities={mockLinkOpportunities} />
    </div>
  );
}
