import { Tool, ToolContext } from "./Tool";

export abstract class BaseTool<TInput = unknown, TOutput = unknown>
  implements Tool<TInput, TOutput>
{
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters?: Record<string, unknown>;

  readonly isTerminal: boolean = false;

  /**
   * Override this in each tool to construct typed input from LLM args + context.
   * Default: passes the raw args through as-is.
   */
  buildInput(args: Record<string, unknown>, _context: ToolContext): TInput {
    return args as unknown as TInput;
  }

  async execute(input: TInput): Promise<TOutput> {
    const startedAt = Date.now();

    console.info("[LinkWise][Tool] Executing", { tool: this.name, input });

    try {
      const result = await this.executeInternal(input);

      console.info("[LinkWise][Tool] Completed", {
        tool: this.name,
        durationMs: Date.now() - startedAt,
      });

      return result;
    } catch (error) {
      console.error("[LinkWise][Tool] Failed", {
        tool: this.name,
        durationMs: Date.now() - startedAt,
        error,
      });

      throw error;
    }
  }

  protected abstract executeInternal(input: TInput): Promise<TOutput>;
}
