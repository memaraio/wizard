import {
  mergeMemaraMcpServer,
  removeMemaraMcpServer,
  type MemaraCredentials,
} from "../lib/mcp-config.js";
import {
  detectInstalledClients,
  type McpClientId,
} from "../lib/mcp-clients.js";
import { getPathTargets, type InstallScope } from "../lib/paths.js";
import { promptCredentials } from "../lib/prompts.js";
import { trackEvent } from "../telemetry.js";

export interface McpCommandOptions {
  apiKey?: string;
  bindingId?: string;
  project?: boolean;
  ci?: boolean;
  clients?: McpClientId[];
}

function resolveScope(project?: boolean): InstallScope {
  return project ? "project" : "global";
}

async function resolveCredentials(
  opts: McpCommandOptions,
): Promise<MemaraCredentials> {
  if (opts.ci && (!opts.apiKey || !opts.bindingId)) {
    throw new Error("--ci requires --api-key and --binding-id");
  }
  return promptCredentials({
    apiKey: opts.apiKey,
    bindingId: opts.bindingId,
  });
}

function configPathsForClient(
  clientId: McpClientId,
  scope: InstallScope,
): string[] {
  const targets = getPathTargets(scope);
  if (clientId === "cursor") return [targets.cursorMcpConfig];
  return [targets.claudeMcpConfig];
}

export async function mcpAdd(opts: McpCommandOptions): Promise<void> {
  const credentials = await resolveCredentials(opts);
  const scope = resolveScope(opts.project);
  const installed = opts.clients?.length
    ? opts.clients
    : (await detectInstalledClients()).map((c) => c.id);

  if (installed.length === 0) {
    console.log("No supported MCP clients detected (Cursor, Claude Code).");
    console.log("Install Cursor or Claude Code, or specify --clients cursor,claude-code");
    return;
  }

  const written: string[] = [];
  for (const clientId of installed) {
    for (const configPath of configPathsForClient(clientId, scope)) {
      const result = await mergeMemaraMcpServer(configPath, credentials);
      written.push(result.path);
      await trackEvent("wizard_mcp_added", {
        client: clientId,
        scope,
        created: result.created,
      });
      console.log(
        `✓ Memara MCP configured for ${clientId} (${scope}): ${result.path}`,
      );
    }
  }

  if (written.length === 0) {
    console.log("No MCP config files were updated.");
  }
}

export async function mcpRemove(opts: McpCommandOptions): Promise<void> {
  const scope = resolveScope(opts.project);
  const clients = opts.clients?.length
    ? opts.clients
    : (["cursor", "claude-code"] as McpClientId[]);

  for (const clientId of clients) {
    for (const configPath of configPathsForClient(clientId, scope)) {
      const removed = await removeMemaraMcpServer(configPath);
      if (removed) {
        console.log(`✓ Removed Memara MCP from ${clientId}: ${configPath}`);
      }
    }
  }
}
