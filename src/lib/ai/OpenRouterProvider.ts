import OpenAI from "openai";

import { AiProvider } from "./provider";
import {
  buildContentSearchPrompt,
  buildUserPrompt,
  contentSearchSystemPrompt,
  systemPrompt,
} from "./prompts";
import { ContentSearchQueriesSchema, LinkOpportunitiesSchema } from "./schemas";

import {
  CurrentPage,
  LinkAnalysisRequest,
  LinkOpportunity,
} from "../recommendations/types";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export class OpenRouterProvider implements AiProvider {
  async generateContentSearchQueries(currentPage: CurrentPage): Promise<string[]> {
    const content = await this.createJsonCompletion(
      contentSearchSystemPrompt,
      buildContentSearchPrompt(currentPage),
    );

    return ContentSearchQueriesSchema.parse(JSON.parse(extractJson(content)));
  }

  async generateLinkOpportunities(
    request: LinkAnalysisRequest,
  ): Promise<LinkOpportunity[]> {
    try {
      const content = await this.createJsonCompletion(
        systemPrompt,
        buildUserPrompt(request.currentPage, request.candidatePages),
      );

      return LinkOpportunitiesSchema.parse(JSON.parse(extractJson(content)));
    } catch (error) {
      console.error("========== OpenRouter Error ==========");
      console.error(error);

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error("Unknown OpenRouter error.");
    }
  }

  private async createJsonCompletion(
    system: string,
    user: string,
  ): Promise<string> {
    const response = await client.chat.completions.create({
      model:
        process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenRouter returned an empty response.");
    }

    return content;
  }
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return (fenced?.[1] ?? trimmed).trim();
}
