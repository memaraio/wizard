import { rm } from "node:fs/promises";
import { join } from "node:path";
import { installSkill } from "../lib/skill-install.js";
import { packSkillZip } from "../lib/skill-pack.js";
import {
  resolveInstallPlanForSubcommand,
  type InstallPlan,
  type InstallPlanOptions,
} from "../lib/install-plan.js";
import { getSkillDirsForClients } from "../lib/paths.js";
import { trackEvent } from "../telemetry.js";

export interface SkillCommandOptions extends InstallPlanOptions {
  plan?: InstallPlan;
  output?: string;
}

export async function skillAdd(opts: SkillCommandOptions): Promise<void> {
  const plan =
    opts.plan ??
    (await resolveInstallPlanForSubcommand({ ...opts, skillOnly: true }));

  const connectorName = plan.connectorName;
  const targetDirs = getSkillDirsForClients(
    plan.scope,
    plan.projectDir,
    plan.clients,
  );

  if (targetDirs.length === 0) {
    console.log("No editors selected for skill install.");
    return;
  }

  const result = await installSkill({
    targetDirs,
    connectorName,
    force: plan.force,
  });

  for (const path of result.installed) {
    console.log(`✓ Installed skill: ${path}`);
    await trackEvent("wizard_skill_added", { scope: plan.scope, path });
  }
  for (const path of result.skipped) {
    console.log(`○ Skipped (already exists): ${path} — use --force to overwrite`);
  }
}

export async function skillRemove(opts: SkillCommandOptions): Promise<void> {
  const plan =
    opts.plan ??
    (await resolveInstallPlanForSubcommand({ ...opts, skillOnly: true }));

  for (const dir of getSkillDirsForClients(
    plan.scope,
    plan.projectDir,
    plan.clients.length ? plan.clients : ["cursor", "claude-code"],
  )) {
    try {
      await rm(dir, { recursive: true, force: true });
      console.log(`✓ Removed skill directory: ${dir}`);
    } catch {
      // ignore missing
    }
  }
}

export async function skillPack(opts: SkillCommandOptions): Promise<void> {
  const output =
    opts.output ?? join(process.cwd(), "memara-memory.zip");
  const zipPath = await packSkillZip({
    outputPath: output,
    connectorName: opts.connectorName ?? "Memara",
  });
  console.log(`✓ Created skill zip: ${zipPath}`);
}
