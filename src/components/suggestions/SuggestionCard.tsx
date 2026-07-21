"use client";

import { useState } from "react";

import { Recommendation } from "./Recommendation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import {
  mdiContentCopy,
  mdiFileDocumentOutline,
  mdiLinkVariant,
} from "@mdi/js";

interface SuggestionCardProps {
  recommendation: Recommendation;
}

export default function SuggestionCard({
  recommendation,
}: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  const confidence = Math.round(recommendation.score * 100);

  const badgeColor =
    confidence >= 95 ? "success" : confidence >= 80 ? "primary" : "warning";

  const copyPath = async () => {
    await navigator.clipboard.writeText(recommendation.path);

    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-b py-4 last:border-b-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon
            path={mdiFileDocumentOutline}
            size="sm"
            className="mt-1 shrink-0 text-muted-foreground"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{recommendation.title}</h3>

              <Badge variant="bold" colorScheme={badgeColor}>
                {confidence}%
              </Badge>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {recommendation.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Path + Copy */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1">
          <Icon
            path={mdiLinkVariant}
            size="sm"
            className="text-muted-foreground"
          />

          <code className="font-mono text-xs">{recommendation.path}</code>
        </div>

        <Button variant="ghost" size="sm" onClick={copyPath}>
          <Icon path={mdiContentCopy} size="sm" />

          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
