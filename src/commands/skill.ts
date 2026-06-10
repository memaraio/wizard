import { rm } from "node:fs/promises";
import { join } from "node:path";
import { installSkill } from "../lib/skill-install.js";
import { packSkillZip } from "../lib/skill-pack.js";
import { getPathTargets, type InstallScope } from "../lib/paths.js";
import { trackEvent } from "../telemetry.js";

export interface SkillCommandOptions {
  project?: boolean;
  connectorName?: string;
  force?: boolean;
  output?: string;
}

function resolveScope(project?: boolean): InstallScope {
  return project ? "project" : "global";
}

function skillDirs(scope: InstallScope): string[] {
  const targets = getPathTargets(scope);
  return [targets.cursorSkillDir, targets.claudeSkillDir];
}

export async function skillAdd(opts: SkillCommandOptions): Promise<void> {
  const scope = resolveScope(opts.project);
  const connectorName = opts.connectorName ?? "Memara";
  const result = await installSkill({
    targetDirs: skillDirs(scope),
    connectorName,
    force: opts.force,
  });

  for (const path of result.installed) {
    console.log(`✓ Installed skill: ${path}`);
    await trackEvent("wizard_skill_added", { scope, path });
  }
  for (const path of result.skipped) {
    console.log(`○ Skipped (already exists): ${path} — use --force to overwrite`);
  }
}

export async function skillRemove(opts: SkillCommandOptions): Promise<void> {
  const scope = resolveScope(opts.project);
  for (const dir of skillDirs(scope)) {
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
