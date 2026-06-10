# Maintainer guide — @memaraio/wizard

For Memara staff shipping the wizard from the monorepo, mirroring to the public GitHub repo, and publishing to npm.

## Repositories

| Repo | Role |
|------|------|
| `packages/memara-wizard/` (monorepo) | Source of truth for development |
| [memaraio/wizard](https://github.com/memaraio/wizard) | Public mirror + GitHub Releases |
| [npm @memaraio/wizard](https://www.npmjs.com/package/@memaraio/wizard) | `npx @memaraio/wizard` distribution |

## Version source of truth

- `package.json` → `version`

## Prerequisites

- Docker with Compose v2
- Public repo **memaraio/wizard** (may start empty; `github-sync` seeds `main`)
- **GitHub PAT** in `packages/memara-wizard/.env.github` (never commit):
  - **Contents: Read and write** on `memaraio/wizard` (read-only passes GET but **fails git push with 403**)
  - **Releases: Read and write** on `memaraio/wizard`
- **npm token** in `packages/memara-wizard/.env.npm` (never commit)

If **memaraio** uses **SAML SSO**: GitHub → **Developer settings** → your token → **Configure SSO** → **Authorize** for **memaraio**.

`github-verify-pat` checks REST `permissions.push` so read-only tokens fail before `github-sync`.

### Troubleshooting 403 on push

```
remote: Permission to memaraio/wizard.git denied to <your-github-user>.
fatal: unable to access '...': The requested URL returned error: 403
```

1. Edit the fine-grained PAT: **memaraio/wizard** → **Contents: Read and write**
2. Authorize SAML SSO for the token on org **memaraio** (if enabled)
3. Re-run `./scripts/docker-wizard.sh github-verify-pat` — must print `OK: PAT can read and push`
4. Re-run `./scripts/docker-wizard.sh github-sync --yes`

Commit wizard changes in the monorepo before `publish-release` (the script blocks on uncommitted files under `packages/memara-wizard/`).

## Docker commands

From **`packages/memara-wizard/`**:

```bash
./scripts/docker-wizard.sh github-verify-pat
./scripts/docker-wizard.sh github-sync --yes
./scripts/docker-wizard.sh github-tag --yes
./scripts/docker-wizard.sh ci
./scripts/docker-wizard.sh publish --yes
./scripts/docker-wizard.sh publish-release --yes
```

Skip prompts: `MEMARA_GITHUB_SKIP_CONFIRM=1`, `MEMARA_PUBLISH_SKIP_CONFIRM=1`, or `--yes`.

## First release smoke test

```bash
cd packages/memara-wizard
./scripts/docker-wizard.sh github-verify-pat
./scripts/docker-wizard.sh github-sync --yes
./scripts/docker-wizard.sh publish-release --yes
```

## Public skill zip (memara.io)

After skill assets change:

```bash
cd packages/memara-wizard
npm run skill:pack
```

Outputs:

- `apps/ui/public/skills/memara-memory/memara-memory.zip`
- `apps/ui/public/skills/memara-memory/SKILL.md` and `SETUP.md`

Served at `https://memara.io/skills/memara-memory/memara-memory.zip`.

## Manual E2E checklist

1. Create Cursor integration at app.memara.io → copy **API key + binding ID**
2. `npx @memaraio/wizard setup --ci --api-key ... --binding-id ...`
3. Verify Cursor MCP tools: `store_memory`, `search_memories`, `list_memories`, `get_server_info`
4. Verify skill at `~/.cursor/skills/memara-memory/`
5. Repeat for Claude Code (`~/.claude/mcp.json`, `~/.claude/skills/memara-memory/`)
6. `npx @memaraio/wizard skill pack` → upload zip to Claude Desktop Skills
7. Confirm zip at `memara.io/skills/memara-memory/memara-memory.zip`

## github-sync excludes

`.env*`, `dist/`, `node_modules/`, coverage/IDE caches (same list as memara-n8n-node).
