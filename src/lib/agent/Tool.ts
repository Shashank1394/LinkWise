export interface Tool<TInput = unknown, TOutput = unknown> {
  /**
   * Unique tool name.
   * This is what the LLM will use to call the tool.
   */
  readonly name: string;

  /**
   * Human-readable description.
   * This will eventually be sent to OpenRouter.
   */
  readonly description: string;

  /**
   * Execute the tool.
   */
  execute(input: TInput): Promise<TOutput>;
}
