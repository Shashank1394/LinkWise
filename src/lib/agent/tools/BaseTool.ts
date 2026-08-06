import { Tool } from "../Tool";

export abstract class BaseTool<
  TInput = unknown,
  TOutput = unknown,
> implements Tool<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly description: string;

  async execute(input: TInput): Promise<TOutput> {
    const startedAt = Date.now();

    console.info("[LinkWise][Tool] Executing", {
      tool: this.name,
      input,
    });

    try {
      const result = await this.run(input);

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

  protected abstract run(input: TInput): Promise<TOutput>;
}
