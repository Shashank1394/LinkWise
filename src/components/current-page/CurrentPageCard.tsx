"use client";

import { useState } from "react";
import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { mdiContentCopy, mdiFileDocument } from "@mdi/js";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";

import { InfoField } from "@/src/components/common/InfoField";

interface CurrentPageCardProps {
  page?: PagesContext["pageInfo"];
  loading: boolean;
  error: unknown;
}

export function CurrentPageCard({
  page,
  loading,
  error,
}: CurrentPageCardProps) {
  const [copied, setCopied] = useState(false);

  const copyItemId = async () => {
    if (!page || !page.id) return;

    await navigator.clipboard.writeText(page.id);

    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  const renderTitle = () => (
    <div className="flex items-center justify-between gap-4">
      <CardTitle className="flex items-center gap-2">
        <Icon
          path={mdiFileDocument}
          size="sm"
          className="shrink-0 text-neutral-fg"
        />
        Current Page
      </CardTitle>

      {page && (
        <Badge variant="bold" colorScheme="primary">
          {page.template.name}
        </Badge>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card style="outline" elevation="sm">
        <CardHeader>
          {renderTitle()}
          <CardDescription>Loading page information...</CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center py-10">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style="outline" elevation="sm">
        <CardHeader>{renderTitle()}</CardHeader>

        <CardContent>
          <Alert variant="danger">
            <AlertTitle>Unable to load page</AlertTitle>

            <AlertDescription>
              Failed to retrieve the current page from the Marketplace SDK.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!page) {
    return (
      <Card style="outline" elevation="sm">
        <CardHeader>{renderTitle()}</CardHeader>

        <CardContent>
          <Alert variant="warning">
            <AlertTitle>No page selected</AlertTitle>

            <AlertDescription>
              The extension could not determine the current page context.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style="outline" elevation="sm">
      <CardHeader>
        {renderTitle()}

        <CardDescription>
          Metadata for the page you're currently editing.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-1">
        <InfoField label="Title" value={page.displayName} />

        <InfoField
          label="Language"
          value={
            <Badge variant="default" colorScheme="neutral">
              {page.language}
            </Badge>
          }
        />

        <InfoField
          label="Route"
          value={
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
              {page.route}
            </code>
          }
        />

        <InfoField
          label="Path"
          value={
            <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {page.path}
            </code>
          }
        />

        <InfoField
          label="Item ID"
          className="border-b-0"
          value={
            <div className="flex items-center gap-2">
              <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                {page.id}
              </code>

              <Button variant="ghost" size="sm" onClick={copyItemId}>
                <Icon path={mdiContentCopy} size="sm" />
              </Button>

              {copied && (
                <span className="text-xs text-success-fg">Copied</span>
              )}
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
