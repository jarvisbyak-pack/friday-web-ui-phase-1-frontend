import { echoTool, systemStatusTool } from "./builtins.js";
import { ToolRegistry } from "./registry.js";

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(systemStatusTool);
  registry.register(echoTool);
  return registry;
}
