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
import { recommendations } from "../../data/recommendations";
import { Recommendation } from "./Recommendation";

interface SuggestedLinksCardProps {
  loading?: boolean;
  error?: string;
}

export default function SuggestedLinksCard({
  loading = false,
  error,
}: SuggestedLinksCardProps) {
  if (loading) {
    return (
      <Card style="outline" elevation="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon path={mdiLinkVariant} size="sm" />
            AI Link Recommendations
          </CardTitle>

          <CardDescription>
            Finding the best internal links for this page...
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
            AI Link Recommendations
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
          AI Link Recommendations
        </CardTitle>

        <CardDescription>
          Recommended pages to strengthen your internal linking strategy.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-2">
        {recommendations.length === 0 ? (
          <Alert variant="warning">
            <AlertDescription>
              No recommendations are available for this page yet.
            </AlertDescription>
          </Alert>
        ) : (
          recommendations.map((recommendation: Recommendation) => (
            <SuggestionCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
