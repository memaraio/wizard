import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildMcpEndpoint,
  buildMemaraServerEntry,
  mergeMemaraMcpServer,
  parseMcpConfigFile,
  removeMemaraMcpServer,
  MEMARA_MCP_SERVER_KEY,
} from "./mcp-config.js";
import { writeFile } from "node:fs/promises";

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

  it("parseMcpConfigFile throws friendly error for invalid JSON", () => {
    assert.throws(
      () => parseMcpConfigFile('{"mcpServers": { broken', "/tmp/mcp.json"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Invalid JSON in \/tmp\/mcp\.json/);
        assert.match(error.message, /Fix the file or rename it/);
        return true;
      },
    );
  });

  it("mergeMemaraMcpServer rejects invalid JSON in existing config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-"));
    const configPath = join(dir, "mcp.json");
    try {
      await writeFile(configPath, '{"mcpServers": { broken', "utf8");
      await assert.rejects(
        () =>
          mergeMemaraMcpServer(configPath, {
            apiKey: "key1",
            bindingId: "b1",
          }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.match(error.message, new RegExp(`Invalid JSON in ${configPath}`));
          return true;
        },
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("mergeMemaraMcpServer treats empty file as empty config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-"));
    const configPath = join(dir, "mcp.json");
    try {
      await writeFile(configPath, "   \n  ", "utf8");
      await mergeMemaraMcpServer(configPath, {
        apiKey: "key1",
        bindingId: "b1",
      });
      const raw = await readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as {
        mcpServers: Record<string, unknown>;
      };
      assert.ok(parsed.mcpServers[MEMARA_MCP_SERVER_KEY]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("mergeMemaraMcpServer parses UTF-8 BOM prefixed JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "memara-wizard-"));
    const configPath = join(dir, "mcp.json");
    try {
      await writeFile(configPath, '\uFEFF{ "mcpServers": {} }', "utf8");
      await mergeMemaraMcpServer(configPath, {
        apiKey: "key1",
        bindingId: "b1",
      });
      const raw = await readFile(configPath, "utf8");
      const parsed = JSON.parse(raw) as {
        mcpServers: Record<string, unknown>;
      };
      assert.ok(parsed.mcpServers[MEMARA_MCP_SERVER_KEY]);
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
