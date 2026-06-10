import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildMcpEndpoint,
  buildMemaraServerEntry,
  mergeMemaraMcpServer,
  removeMemaraMcpServer,
  MEMARA_MCP_SERVER_KEY,
} from "./mcp-config.js";

describe("mcp-config", () => {
  it("buildMcpEndpoint uses binding-scoped URL", () => {
    assert.equal(
      buildMcpEndpoint("abc-123"),
      "https://mcp.memara.io/i/abc-123/mcp",
    );
  });

  it("buildMemaraServerEntry includes bearer header", () => {
    const entry = buildMemaraServerEntry({
      apiKey: "sk_test",
      bindingId: "bind-1",
    });
    assert.equal(entry.type, "http");
    assert.equal(entry.headers.Authorization, "Bearer sk_test");
    assert.match(entry.url, /\/i\/bind-1\/mcp$/);
  });

  it("mergeMemaraMcpServer preserves other servers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-"));
    const configPath = join(dir, "mcp.json");
    try {
      await mergeMemaraMcpServer(configPath, {
        apiKey: "key1",
        bindingId: "b1",
      });
      const raw = await readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as {
        mcpServers: Record<string, unknown>;
      };
      assert.ok(parsed.mcpServers[MEMARA_MCP_SERVER_KEY]);

      await mergeMemaraMcpServer(configPath, {
        apiKey: "key2",
        bindingId: "b2",
      });
      const raw2 = await readFile(configPath, "utf8");
      const parsed2 = JSON.parse(raw2) as {
        mcpServers: Record<string, { headers: { Authorization: string } }>;
      };
      assert.equal(
        parsed2.mcpServers[MEMARA_MCP_SERVER_KEY].headers.Authorization,
        "Bearer key2",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("removeMemaraMcpServer removes memara entry", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-"));
    const configPath = join(dir, "mcp.json");
    try {
      await mergeMemaraMcpServer(configPath, {
        apiKey: "key1",
        bindingId: "b1",
      });
      const removed = await removeMemaraMcpServer(configPath);
      assert.equal(removed, true);
      const raw = await readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as { mcpServers?: Record<string, unknown> };
      assert.equal(parsed.mcpServers?.[MEMARA_MCP_SERVER_KEY], undefined);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
