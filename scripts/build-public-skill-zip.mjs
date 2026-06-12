#!/usr/bin/env node
/**
 * Build memara-memory.zip for apps/ui/public and local Desktop upload.
 * Run from repo root or package directory after assets are finalized.
 */
import { createWriteStream } from "node:fs";
import { readFile, mkdir, cp, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(pkgRoot, "assets", "memara-memory");
const connectorName = process.env.MEMARA_SKILL_CONNECTOR_NAME ?? "Memara";

const uiPublicDir = join(
  pkgRoot,
  "..",
  "..",
  "apps",
  "ui",
  "public",
  "skills",
  "memara-memory",
);
const zipOut = join(uiPublicDir, "memara-memory.zip");
const repoRoot = join(pkgRoot, "..", "..");
const repoSkillDirs = [
  join(repoRoot, ".cursor", "skills", "memara-memory"),
  join(repoRoot, ".claude", "skills", "memara-memory"),
];

async function renderSkill() {
  const template = await readFile(
    join(assetsDir, "SKILL.md.template"),
    "utf8",
  );
  return template.replaceAll("{{CONNECTOR_NAME}}", connectorName);
}

async function packZip(outputPath, skillContent, setupContent) {
  await mkdir(dirname(outputPath), { recursive: true });
  await new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.append(skillContent, { name: "memara-memory/SKILL.md" });
    archive.append(setupContent, { name: "memara-memory/SETUP.md" });
    void archive.finalize();
  });
}

const skillContent = await renderSkill();
const setupContent = await readFile(join(assetsDir, "SETUP.md"), "utf8");

await mkdir(uiPublicDir, { recursive: true });
await writeFile(join(uiPublicDir, "SKILL.md"), skillContent, "utf8");
await cp(join(assetsDir, "SETUP.md"), join(uiPublicDir, "SETUP.md"));
await packZip(zipOut, skillContent, setupContent);

for (const dir of repoSkillDirs) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"), skillContent, "utf8");
}

console.log(`build-public-skill-zip: ${zipOut}`);
console.log(`synced repo skill copies: ${repoSkillDirs.join(", ")}`);
