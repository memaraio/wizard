import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { MemaraCredentials } from "./mcp-config.js";

export interface CredentialPromptOptions {
  apiKey?: string;
  bindingId?: string;
}

export async function promptCredentials(
  opts: CredentialPromptOptions,
): Promise<MemaraCredentials> {
  if (opts.apiKey && opts.bindingId) {
    return { apiKey: opts.apiKey, bindingId: opts.bindingId };
  }

  const rl = createInterface({ input, output });
  try {
    console.log("");
    console.log(
      "Create an integration at https://app.memara.io and copy your API key + binding ID.",
    );
    console.log("");

    const apiKey =
      opts.apiKey ??
      (await rl.question("Memara API key: ")).trim();
    const bindingId =
      opts.bindingId ??
      (await rl.question("Memara binding ID (UUID): ")).trim();

    if (!apiKey || !bindingId) {
      throw new Error("API key and binding ID are required");
    }

    return { apiKey, bindingId };
  } finally {
    rl.close();
  }
}

export function printClaudeDesktopInstructions(): void {
  console.log("");
  console.log("Claude Desktop / claude.ai (Connectors + OAuth):");
  console.log("  1. Add Memara connector at https://mcp.memara.io (OAuth)");
  console.log("  2. Upload skill zip: https://memara.io/skills/memara-memory/memara-memory.zip");
  console.log("  3. See SETUP.md in your skill folder for details");
  console.log("");
}

export function printTestInstructions(): void {
  console.log("Try these prompts in your editor:");
  console.log('  • "Remember that my project uses TypeScript strict mode"');
  console.log('  • "What do you remember about my coding preferences?"');
  console.log("");
}
