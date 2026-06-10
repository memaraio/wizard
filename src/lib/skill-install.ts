import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { getAssetsDir } from "./paths.js";

export function renderSkillTemplate(
  template: string,
  connectorName: string,
): string {
  return template.replaceAll("{{CONNECTOR_NAME}}", connectorName);
}

export interface InstallSkillOptions {
  targetDirs: string[];
  connectorName: string;
  force?: boolean;
}

export interface InstallSkillResult {
  installed: string[];
  skipped: string[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function installSkill(
  options: InstallSkillOptions,
): Promise<InstallSkillResult> {
  const assetsDir = getAssetsDir();
  const template = await readFile(
    join(assetsDir, "SKILL.md.template"),
    "utf8",
  );
  const setupContent = await readFile(join(assetsDir, "SETUP.md"), "utf8");
  const skillContent = renderSkillTemplate(template, options.connectorName);

  const installed: string[] = [];
  const skipped: string[] = [];

  for (const dir of options.targetDirs) {
    const skillPath = join(dir, "SKILL.md");
    const exists = await fileExists(skillPath);
    if (exists && !options.force) {
      skipped.push(dir);
      continue;
    }

    await mkdir(dir, { recursive: true });
    await writeFile(skillPath, skillContent, "utf8");
    await writeFile(join(dir, "SETUP.md"), setupContent, "utf8");
    installed.push(dir);
  }

  return { installed, skipped };
}
