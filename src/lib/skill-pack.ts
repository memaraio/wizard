import { createWriteStream } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import archiver from "archiver";
import { getAssetsDir } from "./paths.js";
import { renderSkillTemplate } from "./skill-install.js";

export interface PackOptions {
  outputPath: string;
  connectorName?: string;
}

export async function packSkillZip(options: PackOptions): Promise<string> {
  const assetsDir = getAssetsDir();
  const connectorName = options.connectorName ?? "Memara";
  const template = await readFile(join(assetsDir, "SKILL.md.template"), "utf8");
  const skillContent = renderSkillTemplate(template, connectorName);
  const setupContent = await readFile(join(assetsDir, "SETUP.md"), "utf8");

  await mkdir(dirname(options.outputPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(options.outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.append(skillContent, { name: "memara-memory/SKILL.md" });
    archive.append(setupContent, { name: "memara-memory/SETUP.md" });
    void archive.finalize();
  });

  return options.outputPath;
}
