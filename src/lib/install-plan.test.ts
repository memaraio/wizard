import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectProjectRoot,
  resolveInstallPlanFromFlags,
  validateInstallOptions,
} from "./install-plan.js";
import {
  describeInstallTargets,
  getSkillDirsForClients,
} from "./paths.js";

describe("install-plan", () => {
  it("detectProjectRoot returns true when package.json exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-plan-"));
    try {
      await writeFile(join(dir, "package.json"), "{}", "utf8");
      assert.equal(await detectProjectRoot(dir), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detectProjectRoot returns false in empty directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-plan-"));
    try {
      assert.equal(await detectProjectRoot(dir), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("validateInstallOptions rejects --project with --global", () => {
    assert.throws(
      () => validateInstallOptions({ project: true, global: true }),
      /--project and --global/,
    );
  });

  it("validateInstallOptions rejects --mcp-only with --skill-only", () => {
    assert.throws(
      () => validateInstallOptions({ mcpOnly: true, skillOnly: true }),
      /--mcp-only and --skill-only/,
    );
  });

  it("resolveInstallPlanFromFlags uses project scope with --project", () => {
    const plan = resolveInstallPlanFromFlags(
      { project: true },
      ["cursor"],
      false,
    );
    assert.equal(plan.scope, "project");
    assert.equal(plan.installMcp, true);
    assert.equal(plan.installSkill, true);
    assert.deepEqual(plan.clients, ["cursor"]);
  });

  it("resolveInstallPlanFromFlags uses global scope with --global", () => {
    const plan = resolveInstallPlanFromFlags(
      { global: true },
      [],
      true,
    );
    assert.equal(plan.scope, "global");
  });

  it("resolveInstallPlanFromFlags ci defaults to project when markers present", () => {
    const plan = resolveInstallPlanFromFlags({ ci: true }, [], true);
    assert.equal(plan.scope, "project");
  });

  it("resolveInstallPlanFromFlags ci defaults to global without project markers", () => {
    const plan = resolveInstallPlanFromFlags({ ci: true }, [], false);
    assert.equal(plan.scope, "global");
  });

  it("resolveInstallPlanFromFlags respects --mcp-only and --clients", () => {
    const plan = resolveInstallPlanFromFlags(
      { mcpOnly: true, clients: ["claude-code"], project: true },
      ["cursor", "claude-code"],
      true,
    );
    assert.equal(plan.installMcp, true);
    assert.equal(plan.installSkill, false);
    assert.deepEqual(plan.clients, ["claude-code"]);
  });

  it("resolveInstallPlanFromFlags uses install-dir as project scope", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-plan-"));
    try {
      const plan = resolveInstallPlanFromFlags(
        { installDir: dir },
        ["cursor"],
        false,
      );
      assert.equal(plan.scope, "project");
      assert.equal(plan.projectDir, dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("paths install helpers", () => {
  it("getSkillDirsForClients filters by client", () => {
    const dirs = getSkillDirsForClients("project", "/tmp/app", ["cursor"]);
    assert.equal(dirs.length, 1);
    assert.match(dirs[0]!, /\/\.cursor\/skills\/memara-memory$/);
  });

  it("describeInstallTargets lists only selected components", () => {
    const lines = describeInstallTargets(
      "project",
      "/tmp/app",
      true,
      false,
      ["cursor"],
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.label, "MCP (Cursor)");
    assert.match(lines[0]!.path, /mcp\.json$/);
  });

  it("describeInstallTargets includes skill paths when requested", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-paths-"));
    try {
      const lines = describeInstallTargets(
        "project",
        dir,
        false,
        true,
        ["cursor", "claude-code"],
      );
      assert.equal(lines.length, 2);
      assert.equal(lines[0]!.label, "Skill (Cursor)");
      assert.equal(lines[1]!.label, "Skill (Claude Code)");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
