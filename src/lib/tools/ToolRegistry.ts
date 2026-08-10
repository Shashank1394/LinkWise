import { Tool } from "./Tool";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<any, any>>();

  register(tool: Tool<any, any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
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
