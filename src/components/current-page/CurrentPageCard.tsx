"use client";

import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { mdiFileDocument } from "@mdi/js";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const renderTitle = () => (
    <CardTitle className="flex items-center gap-2">
      <Icon
        path={mdiFileDocument}
        size="sm"
        className="text-neutral-fg shrink-0"
      />
      Current Page
    </CardTitle>
  );

  if (loading) {
    return (
      <Card style="outline" elevation="sm" className="max-w-2xl mx-auto">
        <CardHeader>
          {renderTitle()}
          <CardDescription>Retrieving page information...</CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style="outline" elevation="sm" className="max-w-2xl mx-auto">
        <CardHeader>{renderTitle()}</CardHeader>

        <CardContent className="pt-2">
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
      <Card style="outline" elevation="sm" className="max-w-2xl mx-auto">
        <CardHeader>{renderTitle()}</CardHeader>

        <CardContent className="pt-2">
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
    <Card style="outline" elevation="sm" className="max-w-2xl mx-auto">
      <CardHeader>
        {renderTitle()}

        <CardDescription>
          Information about the page currently being edited.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <InfoField label="Title" value={page.displayName} />

        <InfoField label="Template" value={page.template.name} badge />

        <InfoField label="Language" value={page.language} badge />

        <InfoField
          label="Route"
          value={<code className="font-mono text-sm">{page.route}</code>}
        />

        <InfoField
          label="Path"
          value={
            <code className="font-mono text-xs break-all">{page.path}</code>
          }
        />

        <InfoField
          label="Item ID"
          value={<code className="font-mono text-xs break-all">{page.id}</code>}
          className="border-b-0"
        />
      </CardContent>
    </Card>
  );
}
