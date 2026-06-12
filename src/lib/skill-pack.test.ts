import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { packSkillZip } from "./skill-pack.js";

describe("skill-pack", () => {
  it("creates zip with memara-memory/ folder root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-pack-"));
    const zipPath = join(dir, "memara-memory.zip");
    try {
      await packSkillZip({ outputPath: zipPath, connectorName: "TestConn" });
      const listing = execSync(`unzip -l "${zipPath}"`, { encoding: "utf8" });
      assert.match(listing, /memara-memory\/SKILL\.md/);
      assert.match(listing, /memara-memory\/SETUP\.md/);

      const skillInZip = execSync(`unzip -p "${zipPath}" memara-memory/SKILL.md`, {
        encoding: "utf8",
      });
      assert.match(skillInZip, /TestConn:store_memory/);
      assert.match(skillInZip, /remember/);
      assert.match(skillInZip, /recall/);
      assert.match(skillInZip, /store/);
      assert.match(skillInZip, /check memory/);
      assert.match(skillInZip, /When in doubt, use this skill/);
      assert.match(skillInZip, /When NOT to use/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
