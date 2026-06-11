import { mcpAdd, type McpCommandOptions } from "./mcp.js";
import { skillAdd, type SkillCommandOptions } from "./skill.js";
import {
  printClaudeDesktopInstructions,
  printTestInstructions,
} from "../lib/prompts.js";
import { resolveInstallPlan, type InstallPlanOptions } from "../lib/install-plan.js";
import { trackEvent } from "../telemetry.js";

export interface SetupOptions extends InstallPlanOptions {
  apiKey?: string;
  bindingId?: string;
}

export async function runSetup(opts: SetupOptions): Promise<void> {
  const interactive = !opts.ci && !opts.yes;
  await trackEvent("wizard_started", { command: "setup", interactive });

  console.log("");
  console.log("Memara Wizard — persistent memory for your AI agents");
  console.log("https://memara.io/wizard");
  console.log("");

  try {
    const plan = await resolveInstallPlan(opts);

    if (plan.installMcp) {
      await mcpAdd({ ...opts, plan });
    }
    if (plan.installSkill) {
      await skillAdd({ ...opts, plan });
    }

    if (!plan.installMcp && !plan.installSkill) {
      console.log("Nothing selected to install.");
      return;
    }

    printClaudeDesktopInstructions();
    if (plan.installMcp || plan.installSkill) {
      printTestInstructions();
    }

    await trackEvent("wizard_completed", {
      scope: plan.scope,
      install_mcp: plan.installMcp,
      install_skill: plan.installSkill,
      clients: plan.clients.join(","),
      prompted: plan.prompted,
      project_dir_set: Boolean(opts.installDir),
    });

    const parts: string[] = [];
    if (plan.installMcp) parts.push("MCP");
    if (plan.installSkill) parts.push("memory skill");
    console.log(`Done! Memara ${parts.join(" and ")} installed (${plan.scope}).`);
  } catch (error) {
    await trackEvent("wizard_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
