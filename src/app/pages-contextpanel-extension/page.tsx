"use client";

import { CurrentPageCard } from "@/src/components/current-page/CurrentPageCard";
import { useCurrentPage } from "@/src/utils/hooks/useCurrentPage";

export default function PagesContextPanel() {
  const { page, loading, error } = useCurrentPage();

  return <CurrentPageCard page={page} loading={loading} error={error} />;
}
