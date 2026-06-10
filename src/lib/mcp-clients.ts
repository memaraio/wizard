import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type McpClientId = "cursor" | "claude-code";

export interface DetectedClient {
  id: McpClientId;
  name: string;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectInstalledClients(): Promise<DetectedClient[]> {
  const home = homedir();
  const detected: DetectedClient[] = [];

  const cursorPaths = [
    join(home, ".cursor"),
    "/Applications/Cursor.app",
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Programs", "cursor")
      : "",
  ].filter(Boolean);

  for (const path of cursorPaths) {
    if (await pathExists(path)) {
      detected.push({ id: "cursor", name: "Cursor" });
      break;
    }
  }

  const claudePaths = [
    join(home, ".claude"),
    "/Applications/Claude.app",
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Programs", "Claude")
      : "",
  ].filter(Boolean);

  for (const path of claudePaths) {
    if (await pathExists(path)) {
      detected.push({ id: "claude-code", name: "Claude Code" });
      break;
    }
  }

  return detected;
}
