import * as p from "@clack/prompts";
import type { DetectedClient, McpClientId } from "./mcp-clients.js";
import { detectOppositeScopeWarnings } from "./install-conflicts.js";
import type { InstallPlan, InstallScope } from "./install-plan.js";
import { describeInstallTargets } from "./paths.js";

export interface PromptInstallPlanInput {
  projectDir: string;
  looksLikeProject: boolean;
  detectedClients: DetectedClient[];
  initialScope: InstallScope;
  initialInstallMcp: boolean;
  initialInstallSkill: boolean;
  initialClients: McpClientId[];
  skipScope?: boolean;
  skipComponents?: boolean;
  skipClients?: boolean;
  skipConfirm?: boolean;
}

function handleCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }
  return value;
}

const CLIENT_LABELS: Record<McpClientId, string> = {
  cursor: "Cursor",
  "claude-code": "Claude Code",
};

export async function promptInstallPlan(
  input: PromptInstallPlanInput,
): Promise<Omit<InstallPlan, "connectorName" | "force">> {
  p.intro("Memara Wizard — install options");

  let scope = input.initialScope;
  if (!input.skipScope) {
    const scopeChoice = handleCancel(
      await p.select({
        message: "Where should Memara be installed?",
        initialValue: input.looksLikeProject ? "project" : scope,
        options: [
          {
            value: "project" as const,
            label: "This project only",
            hint: `${input.projectDir}/.cursor/`,
          },
          {
            value: "global" as const,
            label: "Globally (all projects)",
            hint: "~/.cursor/",
          },
        ],
      }),
    );
    scope = scopeChoice;
  }

  let installMcp = input.initialInstallMcp;
  let installSkill = input.initialInstallSkill;
  if (!input.skipComponents) {
    const components = handleCancel(
      await p.multiselect({
        message: "What would you like to install?",
        options: [
          {
            value: "mcp",
            label: "MCP server",
            hint: "store_memory, search_memories, list_memories",
          },
          {
            value: "skill",
            label: "Memory skill",
            hint: "Teaches your agent when to use memory",
          },
        ],
        initialValues: [
          ...(installMcp ? (["mcp"] as const) : []),
          ...(installSkill ? (["skill"] as const) : []),
        ],
        required: true,
      }),
    );
    installMcp = components.includes("mcp");
    installSkill = components.includes("skill");
  }

  const availableClients =
    input.detectedClients.length > 0
      ? input.detectedClients
      : [
          { id: "cursor" as const, name: "Cursor" },
          { id: "claude-code" as const, name: "Claude Code" },
        ];

  let clients = input.initialClients;
  if (!input.skipClients && availableClients.length > 1) {
    const selected = handleCancel(
      await p.multiselect({
        message: "Which editors?",
        options: availableClients.map((c) => ({
          value: c.id,
          label: c.name,
        })),
        initialValues: clients.filter((id) =>
          availableClients.some((c) => c.id === id),
        ),
        required: true,
      }),
    );
    clients = selected;
  } else if (availableClients.length === 1) {
    clients = [availableClients[0]!.id];
  }

  const oppositeWarnings = await detectOppositeScopeWarnings(
    scope,
    input.projectDir,
  );
  if (oppositeWarnings.length > 0) {
    const scopeLabel = scope === "project" ? "globally" : "in this project";
    p.note(
      oppositeWarnings.map((line) => `• ${line}`).join("\n"),
      `Memara is also installed ${scopeLabel}`,
    );
  }

  const targetLines = describeInstallTargets(
    scope,
    input.projectDir,
    installMcp,
    installSkill,
    clients,
  );

  if (!input.skipConfirm) {
    const summary = targetLines.map((line) => `  ${line.label}: ${line.path}`).join("\n");
    p.note(summary, "Install Memara to");

    const confirmed = handleCancel(
      await p.confirm({
        message: "Proceed with installation?",
        initialValue: true,
      }),
    );

    if (!confirmed) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
  }

  p.outro("Starting installation…");

  return {
    scope,
    projectDir: input.projectDir,
    installMcp,
    installSkill,
    clients,
    prompted: true,
  };
}

export function formatClientList(clients: McpClientId[]): string {
  return clients.map((id) => CLIENT_LABELS[id]).join(", ");
}
