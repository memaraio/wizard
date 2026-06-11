import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { McpClientId } from "./mcp-clients.js";
import { detectInstalledClients } from "./mcp-clients.js";
import type { InstallScope } from "./paths.js";
import { promptInstallPlan } from "./prompts-install.js";

export type { InstallScope };

export interface InstallPlan {
  scope: InstallScope;
  projectDir: string;
  installMcp: boolean;
  installSkill: boolean;
  clients: McpClientId[];
  connectorName: string;
  force: boolean;
  prompted: boolean;
}

export interface InstallPlanOptions {
  project?: boolean;
  global?: boolean;
  installDir?: string;
  mcpOnly?: boolean;
  skillOnly?: boolean;
  yes?: boolean;
  ci?: boolean;
  clients?: McpClientId[];
  connectorName?: string;
  force?: boolean;
}

const PROJECT_MARKERS = [
  ".git",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  join(".cursor"),
];

export async function detectProjectRoot(cwd: string): Promise<boolean> {
  for (const marker of PROJECT_MARKERS) {
    try {
      await access(join(cwd, marker));
      return true;
    } catch {
      // try next marker
    }
  }
  return false;
}

export function resolveProjectDir(opts: InstallPlanOptions): string {
  const fromFlag = opts.installDir ?? process.env.MEMARA_WIZARD_INSTALL_DIR;
  return resolve(fromFlag ?? process.cwd());
}

export function validateInstallOptions(opts: InstallPlanOptions): void {
  const globalFlag =
    opts.global === true || process.env.MEMARA_WIZARD_GLOBAL === "1";

  if (opts.project && globalFlag) {
    throw new Error("--project and --global cannot be used together");
  }
  if (opts.mcpOnly && opts.skillOnly) {
    throw new Error("--mcp-only and --skill-only cannot be used together");
  }
}

function resolveScopeFromFlags(
  opts: InstallPlanOptions,
  projectDir: string,
  looksLikeProject: boolean,
): InstallScope | undefined {
  const globalFlag =
    opts.global === true || process.env.MEMARA_WIZARD_GLOBAL === "1";

  if (globalFlag) return "global";
  if (opts.project) return "project";
  if (opts.installDir || process.env.MEMARA_WIZARD_INSTALL_DIR) {
    return "project";
  }
  if (opts.ci) {
    return looksLikeProject ? "project" : "global";
  }
  return undefined;
}

function resolveComponentsFromFlags(opts: InstallPlanOptions): {
  installMcp: boolean;
  installSkill: boolean;
} {
  if (opts.mcpOnly) return { installMcp: true, installSkill: false };
  if (opts.skillOnly) return { installMcp: false, installSkill: true };
  return { installMcp: true, installSkill: true };
}

function allClientIds(): McpClientId[] {
  return ["cursor", "claude-code"];
}

export function resolveInstallPlanFromFlags(
  opts: InstallPlanOptions,
  detectedClients: McpClientId[],
  looksLikeProject: boolean,
): Omit<InstallPlan, "prompted"> {
  validateInstallOptions(opts);

  const projectDir = resolveProjectDir(opts);
  const scope =
    resolveScopeFromFlags(opts, projectDir, looksLikeProject) ??
    (looksLikeProject ? "project" : "global");
  const { installMcp, installSkill } = resolveComponentsFromFlags(opts);
  const clients =
    opts.clients?.length && opts.clients.length > 0
      ? opts.clients
      : detectedClients.length > 0
        ? detectedClients
        : allClientIds();

  return {
    scope,
    projectDir,
    installMcp,
    installSkill,
    clients,
    connectorName: opts.connectorName ?? "Memara",
    force: opts.force ?? false,
  };
}

function shouldRunInteractivePrompts(opts: InstallPlanOptions): boolean {
  if (opts.ci || opts.yes) return false;

  const globalFlag =
    opts.global === true || process.env.MEMARA_WIZARD_GLOBAL === "1";
  const scopeExplicit =
    opts.project || globalFlag || Boolean(opts.installDir);
  const componentsExplicit = opts.mcpOnly || opts.skillOnly;
  const clientsExplicit = Boolean(opts.clients?.length);

  return !scopeExplicit || !componentsExplicit || !clientsExplicit;
}

export async function resolveInstallPlan(
  opts: InstallPlanOptions,
): Promise<InstallPlan> {
  validateInstallOptions(opts);

  const projectDir = resolveProjectDir(opts);
  const looksLikeProject = await detectProjectRoot(projectDir);
  const detected = await detectInstalledClients();
  const detectedIds = detected.map((c) => c.id);

  const base = resolveInstallPlanFromFlags(opts, detectedIds, looksLikeProject);

  if (!shouldRunInteractivePrompts(opts)) {
    return { ...base, prompted: false };
  }

  const prompted = await promptInstallPlan({
    projectDir,
    looksLikeProject,
    detectedClients: detected,
    initialScope: base.scope,
    initialInstallMcp: base.installMcp,
    initialInstallSkill: base.installSkill,
    initialClients: base.clients,
    skipScope: Boolean(
      opts.project ||
        opts.global ||
        process.env.MEMARA_WIZARD_GLOBAL === "1" ||
        opts.installDir,
    ),
    skipComponents: Boolean(opts.mcpOnly || opts.skillOnly),
    skipClients: Boolean(opts.clients?.length),
    skipConfirm: false,
  });

  return {
    ...prompted,
    connectorName: opts.connectorName ?? "Memara",
    force: opts.force ?? false,
    prompted: true,
  };
}

/**
 * Build an install plan for subcommands (mcp add / skill add) without full setup prompts.
 */
export async function resolveInstallPlanForSubcommand(
  opts: InstallPlanOptions & { mcpOnly?: boolean; skillOnly?: boolean },
): Promise<InstallPlan> {
  validateInstallOptions(opts);

  const projectDir = resolveProjectDir(opts);
  const looksLikeProject = await detectProjectRoot(projectDir);
  const detected = await detectInstalledClients();
  const detectedIds = detected.map((c) => c.id);

  const base = resolveInstallPlanFromFlags(
    {
      ...opts,
      mcpOnly: opts.mcpOnly ?? false,
      skillOnly: opts.skillOnly ?? false,
    },
    detectedIds,
    looksLikeProject,
  );

  return { ...base, prompted: false };
}
