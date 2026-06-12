# @memaraio/wizard

Install Memara MCP server and the **memara-memory** skill for Cursor, Claude Code, and Claude Desktop.

```bash
cd your-project
npx @memaraio/wizard
```

## Quick start

1. Create a **Bare MCP** integration at [app.memara.io](https://app.memara.io) ([Bare MCP](/integrations/bare-mcp)). After creation, copy the **wizard install command** from the success screen (or copy your API key + binding ID).
2. From your **project directory**, run the wizard (interactive):

```bash
npx @memaraio/wizard
```

The wizard asks where to install (this project vs globally), what to install (MCP / skill), which editors, and shows the exact paths before writing files.

3. One-line install (from the dashboard copy button or with your credentials):

```bash
npx @memaraio/wizard --project --yes --api-key "YOUR_KEY" --binding-id "YOUR_BINDING_UUID"
```

4. Non-interactive for CI/scripts:

```bash
npx @memaraio/wizard setup --ci --project --api-key YOUR_KEY --binding-id YOUR_BINDING_UUID
```

Use `--global` instead of `--project` for a home-directory install (legacy default behavior).

## Commands

| Command | Description |
|---------|-------------|
| `setup` (default) | Interactive MCP + skill install |
| `mcp add` | Add Memara to Cursor / Claude Code `mcp.json` |
| `mcp remove` | Remove Memara MCP entry |
| `skill add` | Install memara-memory skill |
| `skill remove` | Remove skill directories |
| `skill pack` | Create `memara-memory.zip` for Claude Desktop |

## Flags

### Install location

- `--project` — install to current project (`.cursor/`, `.mcp.json`)
- `--global` — install to home directory (`~/.cursor/`, `~/.claude/`) for all projects
- `--install-dir <path>` — project root (implies `--project`)

### What to install

- `--mcp-only` — MCP server only
- `--skill-only` — memory skill only
- `--clients <ids>` — comma-separated: `cursor`, `claude-code`

### Other

- `--yes` — skip confirmation; use defaults for unanswered prompts
- `--api-key`, `--binding-id` — skip credential prompts
- `--connector-name` — skill examples prefix (default `Memara`)
- `--ci` — non-interactive; for MCP install requires API key and binding ID
- `--no-telemetry` — disable PostHog analytics
- `--force` — overwrite existing skill files

### Environment variables

- `MEMARA_WIZARD_INSTALL_DIR` — same as `--install-dir`
- `MEMARA_WIZARD_GLOBAL=1` — same as `--global`

## Install scopes

| Scope | Cursor MCP | Claude Code MCP | Skills |
|-------|------------|-----------------|--------|
| **Project** | `.cursor/mcp.json` | `.mcp.json` | `.cursor/skills/memara-memory/`, `.claude/skills/memara-memory/` |
| **Global** | `~/.cursor/mcp.json` | `~/.claude/mcp.json` | `~/.cursor/skills/...`, `~/.claude/skills/...` |

Project-scoped installs are recommended when working in a repo so config travels with the team (commit `.cursor/` if desired).

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

**Project vs global?** Run from your project folder and choose "This project only" (default). Use `--global` for a machine-wide install shared across all projects.

**What is tracked?** Optional PostHog events (`wizard_started`, `wizard_completed`) — no API keys. Opt out with `--no-telemetry`.

**Cost?** The wizard is free. Memory operations count against your Memara API tier.

## Links

- [Wizard landing](https://memara.io/wizard)
- [MCP integration tutorial](https://memara.io/docs)
- Maintainer: [MAINTAINER.md](MAINTAINER.md)
