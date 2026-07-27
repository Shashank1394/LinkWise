import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Icon } from "@/components/ui/icon";

import { mdiLinkVariant } from "@mdi/js";

import SuggestionCard from "./SuggestionCard";
import { LinkOpportunity } from "../../lib/recommendations/types";

interface SuggestedLinksCardProps {
  opportunities: LinkOpportunity[];
  loading?: boolean;
  error?: string;
  onApprove?: (opportunity: LinkOpportunity) => Promise<void>;
}

export default function SuggestedLinksCard({
  opportunities,
  loading = false,
  error,
  onApprove,
}: SuggestedLinksCardProps) {
  if (loading) {
    return (
      <Card style="outline" elevation="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon path={mdiLinkVariant} size="sm" />
            AI Link Opportunities
          </CardTitle>

          <CardDescription>
            Analyzing this page for internal linking opportunities...
          </CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style="outline" elevation="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon path={mdiLinkVariant} size="sm" />
            AI Link Opportunities
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style="outline" elevation="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiLinkVariant} size="sm" />
          AI Link Opportunities
        </CardTitle>

        <CardDescription>
          AI analyzed this page and found phrases that could be linked to
          existing Sitecore pages.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-2">
        {opportunities.length === 0 ? (
          <Alert variant="warning">
            <AlertDescription>
              No internal linking opportunities were found for this page.
            </AlertDescription>
          </Alert>
        ) : (
          opportunities.map((opportunity) => (
            <SuggestionCard
              key={`${opportunity.destination.id}-${opportunity.sourceText}`}
              opportunity={opportunity}
              onApprove={onApprove}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
