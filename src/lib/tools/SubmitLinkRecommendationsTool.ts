import { BaseTool } from "./BaseTool";
import { ToolContext } from "./Tool";
import { LinkOpportunity } from "../types";

export interface SubmitLinkRecommendationsToolInput {
  opportunities: LinkOpportunity[];
  discoveredPageIds: Set<string>;
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
    "Submit your final internal-link recommendations. Call this once you have analyzed the relevant pages and determined which links to suggest. Provide up to 15 opportunities, or an empty array if none are suitable.";

  readonly parameters = {
    type: "object",
    additionalProperties: false,
    required: ["opportunities"],
    properties: {
      opportunities: {
        type: "array",
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

  buildInput(args: Record<string, unknown>, context: ToolContext): SubmitLinkRecommendationsToolInput {
    return {
      opportunities: args.opportunities as LinkOpportunity[],
      discoveredPageIds: context.discoveredPageIds as Set<string>,
    };
  }

  protected async executeInternal(
    input: SubmitLinkRecommendationsToolInput,
  ): Promise<LinkOpportunity[]> {
    const { opportunities, discoveredPageIds } = input;

    // Only keep recommendations that:
    // 1. Have sourceText of at least 2 words (meaningful phrases)
    // 2. Point to a page that was actually discovered by the agent
    // 3. Destination path is an actual page (under /Home/)
    const valid = opportunities.filter((o) => {
      const words = o.sourceText.trim().split(/\s+/);
      if (words.length < 2) return false;
      if (discoveredPageIds.size > 0 && !discoveredPageIds.has(o.destination.id)) return false;
      if (!o.destination.path.toLowerCase().includes("/home/")) return false;
      return true;
    });

    console.info("[LinkWise][Tool][SubmitRecommendations] Submitted", {
      received: input.opportunities.length,
      valid: valid.length,
      filtered: input.opportunities.length - valid.length,
      opportunities: valid.map((o) => ({
        sourceText: o.sourceText.slice(0, 60),
        destinationId: o.destination.id,
        score: o.score,
      })),
    });

    return valid;
  }
}
