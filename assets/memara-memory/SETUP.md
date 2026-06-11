# Memara Setup Guide

## What you need

1. A Memara account — sign up free at [app.memara.io](https://app.memara.io)
2. The Memara MCP server connected to your AI client
3. (Recommended) The Memara memory skill installed via `npx @memaraio/wizard skill add`

## Quick install (Cursor & Claude Code)

Run from your **project directory**:

```bash
npx @memaraio/wizard
```

The wizard asks where to install (this project vs globally), what to install (MCP / skill), and which editors. **Project install** (recommended) writes to `.cursor/` and `.claude/` in your repo; **global install** writes to `~/.cursor/` and `~/.claude/`.

You will need your **API key** and **binding ID** from the Memara dashboard after creating an integration.

## Create an integration

### Cursor

1. Log in at [app.memara.io](https://app.memara.io)
2. Go to **Integrations → Cursor** ([memara.io/integrations/cursor](https://memara.io/integrations/cursor))
3. Create an integration and copy your **API key** and **binding ID**

### Claude Code

1. Log in at [app.memara.io](https://app.memara.io)
2. Go to **Integrations → Claude Desktop** ([memara.io/integrations/claude-desktop](https://memara.io/integrations/claude-desktop))
3. Create an integration and copy your **API key** and **binding ID**

## API-key MCP configuration

For Cursor and Claude Code, the wizard configures:

- **URL:** `https://mcp.memara.io/i/{binding_id}/mcp`
- **Auth:** `Authorization: Bearer {api_key}`

Manual `mcp.json` example:

```json
{
  "mcpServers": {
    "memara": {
      "type": "http",
      "url": "https://mcp.memara.io/i/YOUR_BINDING_ID/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

## Claude Desktop / claude.ai (OAuth)

Claude Desktop uses **Connectors + OAuth**, not API keys in config files:

1. In Claude, go to **Settings → Connectors**
2. Click **Add custom connector**
3. Name: **Memara**, URL: `https://mcp.memara.io`
4. Click **Connect** and complete OAuth in your browser

See the [Claude Desktop transport guide](https://memara.io/docs/mcp/claude-desktop) for details.

### Install the memory skill on Claude Desktop

1. Download [memara-memory.zip](https://memara.io/skills/memara-memory/memara-memory.zip)
2. Go to **Settings → Capabilities → Skills**
3. Upload the zip file

Or run locally:

```bash
npx @memaraio/wizard skill pack -o memara-memory.zip
```

## Claude Code CLI (manual)

```bash
claude mcp add memara --transport http https://mcp.memara.io/i/YOUR_BINDING_ID/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"
```

## Test it

Ask your AI client:

> "Store a memory that my name is [your name]."

Start a new chat and ask:

> "What's my name?"

## Troubleshooting

**Memara tools not appearing:**
- Verify API key and binding ID (no extra spaces)
- Restart Cursor or Claude Code after saving MCP config
- For Claude Desktop, reconnect the connector (Settings → Connectors → Connect)

**Memories not persisting:**
- Ensure the Memara MCP server is connected (tools visible in client)
- Install the memory skill so the agent knows when to store/recall
- Check your Memara plan — free tier has usage limits

**Need help?**
- Wizard: [memara.io/wizard](https://memara.io/wizard)
- Docs: [memara.io/docs](https://memara.io/docs)
- Support: [memara.io/support](https://memara.io/support)
