#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function isAllowedPath(entry) {
  if (/\.env/i.test(entry)) return false;
  if (entry === "package/package.json") return true;
  if (entry === "package/README.md") return true;
  if (entry === "package/LICENSE") return true;
  if (/^package\/dist\//.test(entry)) return true;
  if (/^package\/assets\/memara-memory\//.test(entry)) return true;
  return false;
}

function main() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const packName = execSync("npm pack --silent", { cwd: root, encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .pop();
  if (!packName) {
    console.error("verify-pack: npm pack produced no tarball name");
    process.exit(1);
  }
  const listing = execSync(`tar -tzf "${join(root, packName)}"`, {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  const unexpected = listing.filter((e) => !isAllowedPath(e));
  if (unexpected.length) {
    console.error(
      `verify-pack: unexpected paths in ${packName} (${pkg.name}@${pkg.version}):`,
    );
    for (const u of unexpected) console.error(" ", u);
    process.exit(1);
  }

  const hasCli = listing.some((e) => e === "package/dist/cli.js");
  const hasAssets = listing.some((e) =>
    e.includes("package/assets/memara-memory/SKILL.md.template"),
  );
  if (!hasCli || !hasAssets) {
    console.error("verify-pack: missing dist/cli.js or bundled assets");
    process.exit(1);
  }

  console.log(`verify-pack: OK (${packName}, ${listing.length} paths)`);
}

main();
