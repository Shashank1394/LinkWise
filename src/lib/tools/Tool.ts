import { ChatCompletionTool } from "openai/resources/chat/completions";

/**
 * Context passed to tools so they can inject runtime data
 * that the LLM doesn't (and shouldn't) provide directly.
 */
export interface ToolContext {
  [key: string]: unknown;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly parameters?: Record<string, unknown>;

  /**
   * If true, calling this tool ends the agent loop.
   */
  readonly isTerminal?: boolean;

  /**
   * Build the tool's typed input from the LLM's raw arguments + agent context.
   * Each tool defines this so the agent loop stays generic.
   */
  buildInput(args: Record<string, unknown>, context: ToolContext): TInput;

  /**
   * Execute the tool with fully built input.
   */
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
