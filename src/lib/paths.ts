import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpClientId } from "./mcp-clients.js";

export type InstallScope = "global" | "project";

export interface PathTargets {
  scope: InstallScope;
  projectDir: string;
  cursorMcpConfig: string;
  claudeMcpConfig: string;
  cursorSkillDir: string;
  claudeSkillDir: string;
}

export function getPathTargets(
  scope: InstallScope,
  projectDir = process.cwd(),
): PathTargets {
  if (scope === "project") {
    return {
      scope,
      projectDir,
      cursorMcpConfig: join(projectDir, ".cursor", "mcp.json"),
      claudeMcpConfig: join(projectDir, ".mcp.json"),
      cursorSkillDir: join(projectDir, ".cursor", "skills", "memara-memory"),
      claudeSkillDir: join(projectDir, ".claude", "skills", "memara-memory"),
    };
  }

  const home = homedir();
  return {
    scope,
    projectDir,
    cursorMcpConfig: join(home, ".cursor", "mcp.json"),
    claudeMcpConfig: join(home, ".claude", "mcp.json"),
    cursorSkillDir: join(home, ".cursor", "skills", "memara-memory"),
    claudeSkillDir: join(home, ".claude", "skills", "memara-memory"),
  };
}

export function getMcpConfigPathForClient(
  clientId: McpClientId,
  scope: InstallScope,
  projectDir = process.cwd(),
): string {
  const targets = getPathTargets(scope, projectDir);
  return clientId === "cursor" ? targets.cursorMcpConfig : targets.claudeMcpConfig;
}

export function getSkillDirForClient(
  clientId: McpClientId,
  scope: InstallScope,
  projectDir = process.cwd(),
): string {
  const targets = getPathTargets(scope, projectDir);
  return clientId === "cursor" ? targets.cursorSkillDir : targets.claudeSkillDir;
}

export function getSkillDirsForClients(
  scope: InstallScope,
  projectDir: string,
  clients: McpClientId[],
): string[] {
  return clients.map((clientId) =>
    getSkillDirForClient(clientId, scope, projectDir),
  );
}

export interface InstallTargetLine {
  label: string;
  path: string;
}

export function describeInstallTargets(
  scope: InstallScope,
  projectDir: string,
  installMcp: boolean,
  installSkill: boolean,
  clients: McpClientId[],
): InstallTargetLine[] {
  const lines: InstallTargetLine[] = [];
  const clientLabels: Record<McpClientId, string> = {
    cursor: "Cursor",
    "claude-code": "Claude Code",
  };

  for (const clientId of clients) {
    const name = clientLabels[clientId];
    if (installMcp) {
      lines.push({
        label: `MCP (${name})`,
        path: getMcpConfigPathForClient(clientId, scope, projectDir),
      });
    }
    if (installSkill) {
      lines.push({
        label: `Skill (${name})`,
        path: getSkillDirForClient(clientId, scope, projectDir),
      });
    }
  }

  return lines;
}

export function getAssetsDir(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "assets",
    "memara-memory",
  );
}
