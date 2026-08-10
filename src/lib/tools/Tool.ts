import { ChatCompletionTool } from "openai/resources/chat/completions";

export interface Tool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly parameters?: Record<string, unknown>;
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Converts a Tool to an OpenAI ChatCompletionTool definition.
 */
export function toOpenAiTool(tool: Tool): ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
    },
  };
}
