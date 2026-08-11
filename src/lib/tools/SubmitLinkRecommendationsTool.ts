import { BaseTool } from "./BaseTool";
import { ToolContext } from "./Tool";
import { LinkOpportunity } from "../types";

export interface SubmitLinkRecommendationsToolInput {
  opportunities: LinkOpportunity[];
}

/**
 * Terminal tool — the LLM calls this to submit final recommendations.
 * The agent loop ends when this tool is invoked.
 */
export class SubmitLinkRecommendationsTool extends BaseTool<
  SubmitLinkRecommendationsToolInput,
  LinkOpportunity[]
> {
  readonly name = "submit_link_recommendations";
  readonly isTerminal = true;

  readonly description =
    "Submit your final internal-link recommendations. Call this once you have analyzed the relevant pages and determined which links to suggest. Provide up to 8 opportunities, or an empty array if none are suitable.";

  readonly parameters = {
    type: "object",
    additionalProperties: false,
    required: ["opportunities"],
    properties: {
      opportunities: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["sourceText", "anchorText", "destination", "score", "reason", "seoBenefit"],
          properties: {
            sourceText: { type: "string", minLength: 1 },
            anchorText: { type: "string", minLength: 1 },
            destination: {
              type: "object",
              additionalProperties: false,
              required: ["id", "title", "path"],
              properties: {
                id: { type: "string", minLength: 1 },
                title: { type: "string", minLength: 1 },
                path: { type: "string", minLength: 1 },
              },
            },
            score: { type: "number", minimum: 0, maximum: 100 },
            reason: { type: "string", minLength: 1 },
            seoBenefit: { type: "string", minLength: 1 },
          },
        },
      },
    },
  };

  buildInput(args: Record<string, unknown>, _context: ToolContext): SubmitLinkRecommendationsToolInput {
    return { opportunities: args.opportunities as LinkOpportunity[] };
  }

  protected async executeInternal(
    input: SubmitLinkRecommendationsToolInput,
  ): Promise<LinkOpportunity[]> {
    console.info("[LinkWise][Tool][SubmitRecommendations] Submitted", {
      count: input.opportunities.length,
      opportunities: input.opportunities.map((o) => ({
        sourceText: o.sourceText.slice(0, 60),
        destinationId: o.destination.id,
        score: o.score,
      })),
    });

    return input.opportunities;
  }
}
