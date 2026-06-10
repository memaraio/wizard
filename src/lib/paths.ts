import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

export function getAssetsDir(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "assets",
    "memara-memory",
  );
}
