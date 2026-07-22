import { AiProvider } from "./provider";
import { OpenRouterProvider } from "./OpenRouterProvider";

export function createAiProvider(): AiProvider {
  return new OpenRouterProvider();
}
