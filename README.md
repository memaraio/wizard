# @memaraio/wizard

Install Memara MCP server and the **memara-memory** skill for Cursor, Claude Code, and Claude Desktop.

```bash
npx @memaraio/wizard
```

## Quick start

1. Create an integration at [app.memara.io](https://app.memara.io) ([Cursor](/integrations/cursor) or [Claude Desktop](/integrations/claude-desktop) for API key + binding ID).
2. Run the wizard (interactive):

```bash
npx @memaraio/wizard
```

3. Non-interactive (CI/scripts):

```bash
npx @memaraio/wizard setup --ci --api-key YOUR_KEY --binding-id YOUR_BINDING_UUID
```

## Commands

| Command | Description |
|---------|-------------|
| `setup` (default) | MCP + skill install |
| `mcp add` | Add Memara to Cursor / Claude Code `mcp.json` |
| `mcp remove` | Remove Memara MCP entry |
| `skill add` | Install memara-memory skill |
| `skill remove` | Remove skill directories |
| `skill pack` | Create `memara-memory.zip` for Claude Desktop |

## Flags

- `--project` — install to current project (`.cursor/`, `.mcp.json`) instead of home directory
- `--api-key`, `--binding-id` — skip prompts
- `--connector-name` — skill examples prefix (default `Memara`)
- `--ci` — non-interactive; requires API key and binding ID
- `--no-telemetry` — disable PostHog analytics
- `--force` — overwrite existing skill files

## MCP configuration

API-key clients use binding-scoped URL:

```
https://mcp.memara.io/i/{binding_id}/mcp
Authorization: Bearer {api_key}
```

Claude Desktop / claude.ai use OAuth at `https://mcp.memara.io` (Connectors flow) — see [SETUP.md](assets/memara-memory/SETUP.md).

## Claude Desktop (zip)

Download: [memara.io/skills/memara-memory/memara-memory.zip](https://memara.io/skills/memara-memory/memara-memory.zip)

Or generate locally:

```bash
npx @memaraio/wizard skill pack -o ./memara-memory.zip
```

## FAQ

**MCP vs skill?** MCP provides tools (`store_memory`, etc.). The skill teaches your agent when and how to use them.

**What is tracked?** Optional PostHog events (`wizard_started`, `wizard_completed`) — no API keys. Opt out with `--no-telemetry`.

**Cost?** The wizard is free. Memory operations count against your Memara API tier.

## Links

- [Wizard landing](https://memara.io/wizard)
- [MCP integration tutorial](https://memara.io/docs)
- Maintainer: [MAINTAINER.md](MAINTAINER.md)
