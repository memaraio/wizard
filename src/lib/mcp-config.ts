import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const MEMARA_MCP_SERVER_KEY = "memara";

export interface MemaraCredentials {
  apiKey: string;
  bindingId: string;
}

export interface McpServerEntry {
  type: string;
  url: string;
  headers: { Authorization: string };
}

export interface McpConfigFile {
  mcpServers?: Record<string, McpServerEntry | Record<string, unknown>>;
}

export function buildMcpEndpoint(bindingId: string): string {
  return `https://mcp.memara.io/i/${bindingId}/mcp`;
}

export function buildMemaraServerEntry(
  credentials: MemaraCredentials,
): McpServerEntry {
  return {
    type: "http",
    url: buildMcpEndpoint(credentials.bindingId),
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
    },
  };
}

async function readConfig(path: string): Promise<McpConfigFile> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as McpConfigFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { mcpServers: {} };
    }
    throw error;
  }
}

export async function mergeMemaraMcpServer(
  configPath: string,
  credentials: MemaraCredentials,
): Promise<{ path: string; created: boolean }> {
  const existing = await readConfig(configPath);
  const created = !existing.mcpServers?.[MEMARA_MCP_SERVER_KEY];
  const mcpServers = {
    ...existing.mcpServers,
    [MEMARA_MCP_SERVER_KEY]: buildMemaraServerEntry(credentials),
  };

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(
    configPath,
    `${JSON.stringify({ ...existing, mcpServers }, null, 2)}\n`,
    "utf8",
  );

  return { path: configPath, created };
}

export async function removeMemaraMcpServer(
  configPath: string,
): Promise<boolean> {
  const existing = await readConfig(configPath);
  if (!existing.mcpServers?.[MEMARA_MCP_SERVER_KEY]) {
    return false;
  }

  const { [MEMARA_MCP_SERVER_KEY]: _removed, ...rest } = existing.mcpServers;
  const next: McpConfigFile = {
    ...existing,
    mcpServers: Object.keys(rest).length > 0 ? rest : undefined,
  };

  if (!next.mcpServers) {
    const { mcpServers: _ms, ...withoutServers } = next;
    await writeFile(
      configPath,
      `${JSON.stringify(withoutServers, null, 2)}\n`,
      "utf8",
    );
  } else {
    await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  return true;
}
