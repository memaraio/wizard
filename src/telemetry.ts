import { PostHog } from "posthog-node";
import { getWizardVersion } from "./version.js";

const POSTHOG_HOST =
  process.env.MEMARA_WIZARD_POSTHOG_HOST ?? "https://us.i.posthog.com";

let client: PostHog | null = null;
let disabled = false;

export function initTelemetry(opts: { noTelemetry?: boolean }): void {
  disabled =
    opts.noTelemetry === true ||
    process.env.MEMARA_WIZARD_NO_TELEMETRY === "1";

  if (disabled) return;

  const apiKey = process.env.MEMARA_WIZARD_POSTHOG_KEY;
  if (!apiKey) return;

  client = new PostHog(apiKey, { host: POSTHOG_HOST });
}

export async function trackEvent(
  event: string,
  properties?: Record<string, string | boolean | number>,
): Promise<void> {
  if (disabled || !client) return;

  client.capture({
    distinctId: "memara-wizard-cli",
    event,
    properties: {
      wizard_version: getWizardVersion(),
      ...properties,
    },
  });
}

export async function shutdownTelemetry(): Promise<void> {
  if (client) {
    await client.shutdown();
    client = null;
  }
}
