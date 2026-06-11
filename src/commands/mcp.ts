import {
  mergeMemaraMcpServer,
  removeMemaraMcpServer,
  type MemaraCredentials,
} from "../lib/mcp-config.js";
import {
  detectInstalledClients,
  type McpClientId,
} from "../lib/mcp-clients.js";
import {
  resolveInstallPlanForSubcommand,
  type InstallPlan,
  type InstallPlanOptions,
} from "../lib/install-plan.js";
import { getMcpConfigPathForClient } from "../lib/paths.js";
import { promptCredentials } from "../lib/prompts.js";
import { trackEvent } from "../telemetry.js";

export interface McpCommandOptions extends InstallPlanOptions {
  apiKey?: string;
  bindingId?: string;
  plan?: InstallPlan;
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

export async function mcpAdd(opts: McpCommandOptions): Promise<void> {
  const plan =
    opts.plan ??
    (await resolveInstallPlanForSubcommand({ ...opts, mcpOnly: true }));

  const credentials = await resolveCredentials(opts);
  const clients = plan.clients.length
    ? plan.clients
    : (await detectInstalledClients()).map((c) => c.id);

  if (clients.length === 0) {
    console.log("No supported MCP clients detected (Cursor, Claude Code).");
    console.log(
      "Install Cursor or Claude Code, or specify --clients cursor,claude-code",
    );
    return;
  }

  const written: string[] = [];
  for (const clientId of clients) {
    const configPath = getMcpConfigPathForClient(
      clientId,
      plan.scope,
      plan.projectDir,
    );
    const result = await mergeMemaraMcpServer(configPath, credentials);
    written.push(result.path);
    await trackEvent("wizard_mcp_added", {
      client: clientId,
      scope: plan.scope,
      created: result.created,
    });
    console.log(
      `✓ Memara MCP configured for ${clientId} (${plan.scope}): ${result.path}`,
    );
  }

  if (written.length === 0) {
    console.log("No MCP config files were updated.");
  }
}

export async function mcpRemove(opts: McpCommandOptions): Promise<void> {
  const plan =
    opts.plan ??
    (await resolveInstallPlanForSubcommand({ ...opts, mcpOnly: true }));

  const clients = plan.clients.length
    ? plan.clients
    : (["cursor", "claude-code"] as McpClientId[]);

  for (const clientId of clients) {
    const configPath = getMcpConfigPathForClient(
      clientId,
      plan.scope,
      plan.projectDir,
    );
    const removed = await removeMemaraMcpServer(configPath);
    if (removed) {
      console.log(`✓ Removed Memara MCP from ${clientId}: ${configPath}`);
    }
  }
}
