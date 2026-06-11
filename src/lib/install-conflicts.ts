import { access, readFile } from "node:fs/promises";
import { MEMARA_MCP_SERVER_KEY, parseMcpConfigFile } from "./mcp-config.js";
import { getPathTargets, type InstallScope } from "./paths.js";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function hasMemaraMcpConfig(configPath: string): Promise<boolean> {
  try {
    const raw = await readFile(configPath, "utf8");
    const config = parseMcpConfigFile(raw, configPath);
    return Boolean(config.mcpServers?.[MEMARA_MCP_SERVER_KEY]);
  } catch {
    return false;
  }
}

/**
 * Returns human-readable warnings when Memara is installed in the opposite scope.
 */
export async function detectOppositeScopeWarnings(
  scope: InstallScope,
  projectDir: string,
): Promise<string[]> {
  const oppositeScope: InstallScope = scope === "project" ? "global" : "project";
  const targets = getPathTargets(oppositeScope, projectDir);
  const warnings: string[] = [];

  if (await hasMemaraMcpConfig(targets.cursorMcpConfig)) {
    warnings.push(`MCP (Cursor): ${targets.cursorMcpConfig}`);
  }
  if (await hasMemaraMcpConfig(targets.claudeMcpConfig)) {
    warnings.push(`MCP (Claude Code): ${targets.claudeMcpConfig}`);
  }
  if (await pathExists(targets.cursorSkillDir)) {
    warnings.push(`Skill (Cursor): ${targets.cursorSkillDir}`);
  }
  if (await pathExists(targets.claudeSkillDir)) {
    warnings.push(`Skill (Claude Code): ${targets.claudeSkillDir}`);
  }

  return warnings;
}
