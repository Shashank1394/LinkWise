// src/lib/agent/ToolRegistry.ts

import { Tool } from "./Tool";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }

    this.tools.set(tool.name, tool);

    console.info("[LinkWise][ToolRegistry] Registered tool", {
      tool: tool.name,
    });
  }

  registerMany(tools: Tool[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): Tool[] {
    return [...this.tools.values()];
  }

  listToolNames(): string[] {
    return [...this.tools.keys()];
  }
}
