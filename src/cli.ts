#!/usr/bin/env node
import { Command } from "commander";
import { runSetup } from "./commands/setup.js";
import { mcpAdd, mcpRemove } from "./commands/mcp.js";
import { skillAdd, skillRemove, skillPack } from "./commands/skill.js";
import { initTelemetry, shutdownTelemetry } from "./telemetry.js";
import { getWizardVersion } from "./version.js";
import type { InstallPlanOptions } from "./lib/install-plan.js";
import type { McpClientId } from "./lib/mcp-clients.js";

function parseClients(value: string): McpClientId[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as McpClientId[];
}

function buildPlanOptions(
  opts: Record<string, unknown>,
  extra?: { clients?: McpClientId[]; mcpOnly?: boolean; skillOnly?: boolean },
): InstallPlanOptions {
  return {
    project: opts.project as boolean | undefined,
    global: opts.global as boolean | undefined,
    installDir: opts.installDir as string | undefined,
    mcpOnly: extra?.mcpOnly ?? (opts.mcpOnly as boolean | undefined),
    skillOnly: extra?.skillOnly ?? (opts.skillOnly as boolean | undefined),
    yes: opts.yes as boolean | undefined,
    ci: opts.ci as boolean | undefined,
    clients: extra?.clients ?? (opts.clients as McpClientId[] | undefined),
    connectorName: opts.connectorName as string | undefined,
    force: opts.force as boolean | undefined,
  };
}

const program = new Command();

program
  .name("memara-wizard")
  .description(
    "Install Memara MCP server and memory skill for Cursor, Claude Code, and Claude Desktop",
  )
  .version(getWizardVersion())
  .option("--project", "Install to current project instead of global home directory")
  .option("--global", "Install globally (home directory) for all projects")
  .option(
    "--install-dir <path>",
    "Project directory to install into (implies --project)",
  )
  .option("--mcp-only", "Install MCP server only (skip skill)")
  .option("--skill-only", "Install memory skill only (skip MCP)")
  .option("--yes", "Skip confirmation prompt; accept defaults for unanswered options")
  .option("--connector-name <name>", "Connector name for skill examples", "Memara")
  .option("--api-key <key>", "Memara integration API key")
  .option("--binding-id <id>", "Memara integration binding ID")
  .option(
    "--clients <ids>",
    "Comma-separated editors: cursor,claude-code",
    parseClients,
  )
  .option("--ci", "Non-interactive mode (requires --api-key and --binding-id for MCP)")
  .option("--no-telemetry", "Disable PostHog telemetry")
  .option("--force", "Overwrite existing skill files")
  .option("--debug", "Enable debug logging");

program
  .command("setup", { isDefault: true })
  .description("Full setup: MCP + memory skill (default command)")
  .action(async () => {
    const opts = program.opts();
    initTelemetry({ noTelemetry: opts.telemetry === false });
    try {
      await runSetup({
        ...buildPlanOptions(opts),
        apiKey: opts.apiKey as string | undefined,
        bindingId: opts.bindingId as string | undefined,
      });
    } finally {
      await shutdownTelemetry();
    }
  });

const mcp = program.command("mcp").description("Manage Memara MCP server config");

mcp
  .command("add")
  .description("Add Memara MCP server to Cursor and Claude Code")
  .option("--clients <ids>", "Comma-separated: cursor,claude-code", parseClients)
  .action(async (cmdOpts: { clients?: McpClientId[] }) => {
    const opts = program.opts();
    initTelemetry({ noTelemetry: opts.telemetry === false });
    try {
      await mcpAdd({
        ...buildPlanOptions(opts, { clients: cmdOpts.clients, mcpOnly: true }),
        apiKey: opts.apiKey as string | undefined,
        bindingId: opts.bindingId as string | undefined,
      });
    } finally {
      await shutdownTelemetry();
    }
  });

mcp
  .command("remove")
  .description("Remove Memara MCP server from config files")
  .option("--clients <ids>", "Comma-separated: cursor,claude-code", parseClients)
  .action(async (cmdOpts: { clients?: McpClientId[] }) => {
    const opts = program.opts();
    await mcpRemove({
      ...buildPlanOptions(opts, { clients: cmdOpts.clients, mcpOnly: true }),
    });
  });

const skill = program.command("skill").description("Manage Memara memory skill");

skill
  .command("add")
  .description("Install memara-memory skill for Cursor and Claude Code")
  .action(async () => {
    const opts = program.opts();
    initTelemetry({ noTelemetry: opts.telemetry === false });
    try {
      await skillAdd({
        ...buildPlanOptions(opts, { skillOnly: true }),
      });
    } finally {
      await shutdownTelemetry();
    }
  });

skill
  .command("remove")
  .description("Remove memara-memory skill directories")
  .action(async () => {
    const opts = program.opts();
    await skillRemove({
      ...buildPlanOptions(opts, { skillOnly: true }),
    });
  });

skill
  .command("pack")
  .description("Create memara-memory.zip for Claude Desktop upload")
  .option("-o, --output <path>", "Output zip path")
  .action(async (cmdOpts: { output?: string }) => {
    const opts = program.opts();
    await skillPack({
      output: cmdOpts.output,
      connectorName: opts.connectorName as string | undefined,
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
