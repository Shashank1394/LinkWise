"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InfoFieldProps {
  label: string;
  value?: ReactNode;
  badge?: boolean;
  className?: string;
}

export function InfoField({
  label,
  value,
  badge = false,
  className,
}: InfoFieldProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3 border-b border-border last:border-b-0",
        className,
      )}
    >
      <span className="text-sm text-subtle-text">{label}</span>

      {badge ? (
        <Badge colorScheme="neutral">{value ?? "-"}</Badge>
      ) : (
        <span className="text-sm font-medium text-right break-all">
          {value ?? "-"}
        </span>
      )}
    </div>
  );
}
