import { Tool } from "./Tool";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<any, any>>();

  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }

    this.tools.set(tool.name, tool);

    console.info("[LinkWise][ToolRegistry] Tool registered", {
      tool: tool.name,
    });
  }

  registerMany(tools: Tool<any, any>[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get<T extends Tool<any, any>>(name: string): T | undefined {
    const tool = this.tools.get(name);

    console.info("[LinkWise][ToolRegistry] Tool lookup", {
      tool: name,
      found: Boolean(tool),
    });

    return tool as T | undefined;
  }

  getAll(): Tool<any, any>[] {
    return [...this.tools.values()];
  }

  list(): string[] {
    return [...this.tools.keys()];
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}
