export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;

  execute(input: TInput): Promise<TOutput>;
}
