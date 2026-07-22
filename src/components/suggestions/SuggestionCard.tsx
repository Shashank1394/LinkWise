"use client";

import { useState } from "react";

import { LinkOpportunity } from "../../lib/recommendations/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { mdiContentCopy, mdiLinkVariant, mdiTextBoxOutline } from "@mdi/js";

interface SuggestionCardProps {
  opportunity: LinkOpportunity;
}

export default function SuggestionCard({ opportunity }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  const badgeColor =
    opportunity.score >= 95
      ? "success"
      : opportunity.score >= 80
        ? "primary"
        : "warning";

  const copyPath = async () => {
    await navigator.clipboard.writeText(opportunity.destination.path);

    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-b py-4 last:border-b-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon
            path={mdiTextBoxOutline}
            size="sm"
            className="mt-1 shrink-0 text-muted-foreground"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">
                "{opportunity.sourceText}"
              </h3>

              <Badge variant="bold" colorScheme={badgeColor}>
                {opportunity.score}%
              </Badge>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {opportunity.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className="mt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Link To
        </p>

        <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-2">
          <Icon
            path={mdiLinkVariant}
            size="sm"
            className="text-muted-foreground"
          />

          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {opportunity.destination.title}
            </div>

            <code className="font-mono text-xs">
              {opportunity.destination.path}
            </code>
          </div>
        </div>
      </div>

      {/* SEO Benefit */}
      <div className="mt-4 rounded-md border bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          SEO Benefit
        </p>

        <p className="mt-1 text-sm">{opportunity.seoBenefit}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={copyPath}>
          <Icon path={mdiContentCopy} size="sm" />
          {copied ? "Copied" : "Copy Path"}
        </Button>
      </div>
    </div>
  );
}
