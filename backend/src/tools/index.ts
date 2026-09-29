import {
  echoTool,
  systemStatusTool
} from "./builtins.js";
import {
  githubCreateBranchTool,
  githubCreatePullRequestTool,
  githubGetFileTool,
  githubListRepositoriesTool,
  githubSearchCodeTool,
  githubUpsertFileTool
} from "./github.js";
import { ToolRegistry } from "./registry.js";

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(systemStatusTool);
  registry.register(echoTool);
  registry.register(githubListRepositoriesTool);
  registry.register(githubGetFileTool);
  registry.register(githubSearchCodeTool);
  registry.register(githubCreateBranchTool);
  registry.register(githubUpsertFileTool);
  registry.register(githubCreatePullRequestTool);
  return registry;
}
