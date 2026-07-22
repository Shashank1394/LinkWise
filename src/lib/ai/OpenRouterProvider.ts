import OpenAI from "openai";

import { AiProvider } from "./provider";
import { buildUserPrompt, systemPrompt } from "./prompts";
import { LinkOpportunitiesSchema } from "./schemas";

import { LinkAnalysisRequest, LinkOpportunity } from "../recommendations/types";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export class OpenRouterProvider implements AiProvider {
  async generateLinkOpportunities(
    request: LinkAnalysisRequest,
  ): Promise<LinkOpportunity[]> {
    console.log("========== OpenRouter ==========");
    console.log("API Key Exists:", !!process.env.OPENROUTER_API_KEY);
    console.log("Model:", process.env.OPENROUTER_MODEL);

    try {
      const response = await client.chat.completions.create({
        model:
          process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free",

        temperature: 0.2,

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: buildUserPrompt(
              request.currentPage,
              request.candidatePages,
            ),
          },
        ],
      });

      console.log("OpenRouter Response:");
      console.dir(response, { depth: null });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("OpenRouter returned an empty response.");
      }

      console.log("Raw AI Response:");
      console.log(content);

      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse JSON:");
        console.error(content);

        throw new Error(
          "OpenRouter returned a response that is not valid JSON.",
        );
      }

      const opportunities = LinkOpportunitiesSchema.parse(parsed);

      console.log("Validated Opportunities:");
      console.dir(opportunities, { depth: null });

      return opportunities;
    } catch (error) {
      console.error("========== OpenRouter Error ==========");
      console.error(error);

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error("Unknown OpenRouter error.");
    }
  }
}
