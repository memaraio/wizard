import { mcpAdd, type McpCommandOptions } from "./mcp.js";
import { skillAdd, type SkillCommandOptions } from "./skill.js";
import {
  printClaudeDesktopInstructions,
  printTestInstructions,
} from "../lib/prompts.js";
import { trackEvent } from "../telemetry.js";

export interface SetupOptions extends McpCommandOptions, SkillCommandOptions {}

export async function runSetup(opts: SetupOptions): Promise<void> {
  await trackEvent("wizard_started", { command: "setup" });

  console.log("");
  console.log("Memara Wizard — persistent memory for your AI agents");
  console.log("https://memara.io/wizard");
  console.log("");

  try {
    await mcpAdd(opts);
    await skillAdd({
      project: opts.project,
      connectorName: opts.connectorName,
      force: opts.force,
    });

    printClaudeDesktopInstructions();
    printTestInstructions();

    await trackEvent("wizard_completed", {
      scope: opts.project ? "project" : "global",
    });
    console.log("Done! Memara MCP and memory skill are installed.");
  } catch (error) {
    await trackEvent("wizard_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
