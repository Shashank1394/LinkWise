"use client";

import { useState } from "react";

import { LinkOpportunity } from "../../lib/recommendations/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import {
  mdiCheck,
  mdiContentCopy,
  mdiLinkVariant,
  mdiTextBoxOutline,
} from "@mdi/js";

interface SuggestionCardProps {
  opportunity: LinkOpportunity;
  onApprove?: (opportunity: LinkOpportunity) => Promise<void>;
}

export default function SuggestionCard({
  opportunity,
  onApprove,
}: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvalError, setApprovalError] = useState<string>();

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

  const approve = async () => {
    if (!onApprove) return;

    setIsApproving(true);
    setApprovalError(undefined);

    try {
      await onApprove(opportunity);
      setApproved(true);
    } catch (error) {
      setApprovalError(
        error instanceof Error ? error.message : "Unable to add the link.",
      );
    } finally {
      setIsApproving(false);
    }
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

        {onApprove && (
          <Button
            size="sm"
            onClick={approve}
            disabled={isApproving || approved}
          >
            <Icon path={mdiCheck} size="sm" />
            {approved ? "Added" : isApproving ? "Adding..." : "Approve & Add"}
          </Button>
        )}
      </div>

      {approvalError && (
        <p className="mt-2 text-sm text-destructive">{approvalError}</p>
      )}
    </div>
  );
}
