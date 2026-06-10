#!/bin/bash

# Memara Wizard Development Script
# Usage: ./scripts/docker-wizard.sh [command]
#
# Publish: requires memara-wizard-dev running (or it will be started). Uses /app/.env.npm
# from the bind-mounted package directory for npm auth. Optional: ./docker-wizard.sh publish --yes
# or MEMARA_PUBLISH_SKIP_CONFIRM=1 to skip the confirmation prompt.
# GitHub mirror (github-sync / github-tag): uses /app/.env.github inside the container; monorepo-safe.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PACKAGE_ROOT}/docker-compose.wizard.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
	echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
	echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
	echo -e "${RED}[ERROR] $1${NC}"
	exit 1
}

# docker-compose (v1) or `docker compose` (v2)
check_docker() {
	if command -v docker-compose &>/dev/null; then
		return 0
	fi
	if docker compose version &>/dev/null; then
		return 0
	fi
	error "Docker Compose is required (install docker-compose or use Docker CLI v2 with 'docker compose')."
}

dc() {
	if command -v docker-compose &>/dev/null; then
		docker-compose -f "${COMPOSE_FILE}" "$@"
	else
		docker compose -f "${COMPOSE_FILE}" "$@"
	fi
}

ensure_dev_running() {
	if ! dc exec -T memara-wizard-dev true 2>/dev/null; then
		log "Starting memara-wizard-dev (build may take a while on first run)..."
		dc up -d --build memara-wizard-dev
	fi
}

# Build and start development environment
start_dev() {
	log "Starting Memara wizard development environment..."
	dc up -d --build memara-wizard-dev
	log "Development environment started!"
}

# Stop services
stop() {
	log "Stopping all services..."
	dc down
	log "All services stopped!"
}

# Show logs
logs() {
	local service=${1:-}
	if [ -n "$service" ]; then
		dc logs -f "$service"
	else
		dc logs -f
	fi
}

# Build the node
build() {
	ensure_dev_running
	log "Building Memara wizard..."
	dc exec -T memara-wizard-dev npm run build
	log "Build completed!"
}

# Run linting
lint() {
	ensure_dev_running
	log "Running linter..."
	dc exec -T memara-wizard-dev npm run lint
}

# Build + test + lint (CI-style gate)
ci() {
	ensure_dev_running
	log "Running CI (build + test + verify:pack + lint)..."
	dc exec -T memara-wizard-dev sh -ec 'cd /app && npm run build && npm test && npm run verify:pack && npm run lint'
	log "CI completed."
}

# Build and npm pack (tarball in package root on the host)
pack() {
	ensure_dev_running
	log "Building and creating npm tarball..."
	dc exec -T memara-wizard-dev sh -ec 'cd /app && npm run build && npm pack'
	log "Pack completed. Look for memara-wizard-*.tgz in ${PACKAGE_ROOT}"
}

# Run tests
test() {
	ensure_dev_running
	log "Running tests..."
	dc exec -T memara-wizard-dev npm test
}

# --- GitHub mirror (monorepo-safe): git runs inside container in /tmp clones; see README. ---

github_verify_pat() {
	ensure_dev_running
	log "Verifying PAT from /app/.env.github against GitHub API..."
	dc exec -T memara-wizard-dev sh -ec "$(cat <<'EOS'
set -e
unset GITHUB_TOKEN
export GIT_TERMINAL_PROMPT=0
if [ ! -f /app/.env.github ] || [ ! -s /app/.env.github ]; then
  echo "ERROR: /app/.env.github missing or empty." >&2
  exit 1
fi
MEMARA_GH_PAT=$(node -e 'const fs=require("fs");let t=fs.readFileSync("/app/.env.github","utf8").trim();if(t.includes("=")&&!t.startsWith("ghp_")&&!t.startsWith("github_pat_")){const p=t.split("=",2);t=p.length===2?p[1].trim():t;}t=t.replace(/^["\x27]|["\x27]$/g,"");if(!t)process.exit(1);process.stdout.write(t);')
MEMARA_GH_REPO=$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("/app/package.json","utf8"));const u=p.repository?.url||"";const m=u.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\s*$/i);if(!m)process.exit(1);process.stdout.write(m[1]+"/"+m[2]);')
HTTP_CODE=$(curl -sSL -o /tmp/gh-repo.json -w "%{http_code}" \
  -H "Authorization: Bearer ${MEMARA_GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${MEMARA_GH_REPO}" || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: GitHub REST API GET repo returned HTTP ${HTTP_CODE} (expected 200)." >&2
  echo "Fine-grained token: add the repository with Contents Read and write." >&2
  if [ -s /tmp/gh-repo.json ]; then
    head -c 800 /tmp/gh-repo.json | tr "\n" " " >&2 || true
    echo >&2
  fi
  exit 1
fi
# Note: GET /repos permissions reflect your user role, not the token granted scopes.
export MEMARA_GH_REPO
VERIFY_PATH="_memara_pat_verify.txt"
PUT_BODY=$(node -e 'const c=Buffer.from("memara-wizard pat verify").toString("base64");process.stdout.write(JSON.stringify({message:"memara-wizard PAT verify",content:c}));')
PUT_CODE=$(curl -sSL -o /tmp/gh-put.json -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer ${MEMARA_GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/${MEMARA_GH_REPO}/contents/${VERIFY_PATH}" \
  -d "${PUT_BODY}" || echo "000")
if [ "$PUT_CODE" != "201" ]; then
  echo "ERROR: Token cannot write to https://github.com/${MEMARA_GH_REPO} (Contents API HTTP ${PUT_CODE})." >&2
  echo "Fine-grained token: Repository permissions → Contents: Read and write (required for github-sync)." >&2
  echo "GET /repos may show permissions.push true for your user; that does not mean the token can write." >&2
  echo "If memaraio uses SAML SSO: Developer settings → your token → Configure SSO → Authorize memaraio." >&2
  if [ -s /tmp/gh-put.json ]; then
    head -c 600 /tmp/gh-put.json | tr "\n" " " >&2 || true
    echo >&2
  fi
  exit 1
fi
VERIFY_SHA=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync("/tmp/gh-put.json","utf8"));process.stdout.write(j.content?.sha||"");')
if [ -n "${VERIFY_SHA}" ]; then
  DELETE_BODY=$(VERIFY_SHA="${VERIFY_SHA}" node -e 'const sha=process.env.VERIFY_SHA;process.stdout.write(JSON.stringify({message:"memara-wizard PAT verify cleanup",sha}));')
  curl -sSL -o /dev/null -X DELETE \
    -H "Authorization: Bearer ${MEMARA_GH_PAT}" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/${MEMARA_GH_REPO}/contents/${VERIFY_PATH}" \
    -d "${DELETE_BODY}" || true
fi
echo "OK: Token can write to https://github.com/${MEMARA_GH_REPO} (Contents API verified)"
G() { git -c credential.helper= "$@"; }
AUTH_REMOTE="https://x-access-token:${MEMARA_GH_PAT}@github.com/${MEMARA_GH_REPO}.git"
if ! G ls-remote "${AUTH_REMOTE}" HEAD >/dev/null 2>&1; then
  echo "WARNING: git ls-remote failed; github-sync uses git push and may still fail." >&2
  G ls-remote "${AUTH_REMOTE}" HEAD 2>&1 | head -3 >&2 || true
  exit 1
fi
echo "OK: git ls-remote succeeded for https://github.com/${MEMARA_GH_REPO}"
EOS
)"
}

github_sync() {
	local skip_confirm="${MEMARA_GITHUB_SKIP_CONFIRM:-}"
	if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "-y" ]; then
		skip_confirm=1
	fi
	if [ -z "$skip_confirm" ]; then
		read -p "Push package tree to public GitHub repo (main)? (y/N): " -r response
		if [[ ! "$response" =~ ^[Yy]$ ]]; then
			log "GitHub sync cancelled."
			return 0
		fi
	fi
	ensure_dev_running
	log "Syncing /app to public repository (branch main) via ephemeral clone in container..."
	dc exec -T memara-wizard-dev sh -ec "$(cat <<'EOS'
set -e
unset GITHUB_TOKEN
export GIT_TERMINAL_PROMPT=0
if [ ! -f /app/.env.github ] || [ ! -s /app/.env.github ]; then
  echo "ERROR: /app/.env.github missing or empty." >&2
  exit 1
fi
MEMARA_GH_PAT=$(node -e 'const fs=require("fs");let t=fs.readFileSync("/app/.env.github","utf8").trim();if(t.includes("=")&&!t.startsWith("ghp_")&&!t.startsWith("github_pat_")){const p=t.split("=",2);t=p.length===2?p[1].trim():t;}t=t.replace(/^["\x27]|["\x27]$/g,"");if(!t)process.exit(1);process.stdout.write(t);')
MEMARA_GH_REPO=$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("/app/package.json","utf8"));const u=p.repository?.url||"";const m=u.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\s*$/i);if(!m)process.exit(1);process.stdout.write(m[1]+"/"+m[2]);')
HTTP_CODE=$(curl -sSL -o /tmp/gh-repo.json -w "%{http_code}" \
  -H "Authorization: Bearer ${MEMARA_GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${MEMARA_GH_REPO}" || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: GitHub REST API GET repo returned HTTP ${HTTP_CODE} (expected 200)." >&2
  echo "Fine-grained token: add the repository, Contents Read and write." >&2
  if [ -s /tmp/gh-repo.json ]; then
    head -c 600 /tmp/gh-repo.json | tr "\n" " " >&2 || true
    echo >&2
  fi
  exit 1
fi
G() { git -c credential.helper= "$@"; }
G config --global user.name "Memara"
G config --global user.email "github@memara.io"
AUTH_REMOTE="https://x-access-token:${MEMARA_GH_PAT}@github.com/${MEMARA_GH_REPO}.git"
WORK="/tmp/memara-wizard-github-$$"
rm -rf "${WORK}"
mkdir -p "${WORK}"
cd "${WORK}"
LS_REMOTE_OUT=$(G ls-remote "${AUTH_REMOTE}" 2>&1) || true
if echo "${LS_REMOTE_OUT}" | grep -qiE '403|401|Authentication failed|Permission denied|denied to'; then
  echo "ERROR: git ls-remote failed (PAT cannot access repo over HTTPS):" >&2
  echo "${LS_REMOTE_OUT}" >&2
  echo "Authorize SAML SSO on the token for org memaraio, then retry." >&2
  exit 1
fi
if [ -n "${LS_REMOTE_OUT}" ]; then
  G clone --depth 1 "${AUTH_REMOTE}" publish
  cd publish
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  G clean -fdx >/dev/null 2>&1 || true
else
  mkdir publish
  cd publish
  G init -b main
  G remote add origin "${AUTH_REMOTE}"
fi
tar -C /app \
  --exclude='./.git' \
  --exclude='./.env.github' \
  --exclude='./.env.npm' \
  --exclude='./.env' \
  --exclude='./dist' \
  --exclude='./node_modules' \
  --exclude='./htmlcov' \
  --exclude='./.pytest_cache' \
  --exclude='./.coverage' \
  --exclude='./.eslintcache' \
  --exclude='./.nyc_output' \
  --exclude='./coverage' \
  --exclude='./.idea' \
  --exclude='./.vscode' \
  --exclude='__pycache__' \
  -cf - . | tar -C "$(pwd)" -xf -
G add -A
if G diff --staged --quiet; then
  echo "Nothing to commit; remote already matches this tree."
  exit 0
fi
VERSION=$(node -p "require('/app/package.json').version")
G commit -m "Sync memara-wizard from monorepo (${VERSION})"
G push -u origin main
EOS
)"
	log "GitHub sync finished."
}

github_tag() {
	local skip_confirm="${MEMARA_GITHUB_SKIP_CONFIRM:-}"
	if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "-y" ]; then
		skip_confirm=1
	fi
	if [ -z "$skip_confirm" ]; then
		read -p "Create and push annotated tag v* on public GitHub repo? (y/N): " -r response
		if [[ ! "$response" =~ ^[Yy]$ ]]; then
			log "GitHub tag cancelled."
			return 0
		fi
	fi
	ensure_dev_running
	log "Creating and pushing release tag on public repository..."
	dc exec -T memara-wizard-dev sh -ec "$(cat <<'EOS'
set -e
unset GITHUB_TOKEN
export GIT_TERMINAL_PROMPT=0
if [ ! -f /app/.env.github ] || [ ! -s /app/.env.github ]; then
  echo "ERROR: /app/.env.github missing or empty." >&2
  exit 1
fi
MEMARA_GH_PAT=$(node -e 'const fs=require("fs");let t=fs.readFileSync("/app/.env.github","utf8").trim();if(t.includes("=")&&!t.startsWith("ghp_")&&!t.startsWith("github_pat_")){const p=t.split("=",2);t=p.length===2?p[1].trim():t;}t=t.replace(/^["\x27]|["\x27]$/g,"");if(!t)process.exit(1);process.stdout.write(t);')
MEMARA_GH_REPO=$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("/app/package.json","utf8"));const u=p.repository?.url||"";const m=u.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\s*$/i);if(!m)process.exit(1);process.stdout.write(m[1]+"/"+m[2]);')
HTTP_CODE=$(curl -sSL -o /tmp/gh-repo.json -w "%{http_code}" \
  -H "Authorization: Bearer ${MEMARA_GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${MEMARA_GH_REPO}" || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: GitHub REST API GET repo returned HTTP ${HTTP_CODE} (expected 200)." >&2
  if [ -s /tmp/gh-repo.json ]; then
    head -c 600 /tmp/gh-repo.json | tr "\n" " " >&2 || true
    echo >&2
  fi
  exit 1
fi
G() { git -c credential.helper= "$@"; }
G config --global user.name "Memara"
G config --global user.email "github@memara.io"
AUTH_REMOTE="https://x-access-token:${MEMARA_GH_PAT}@github.com/${MEMARA_GH_REPO}.git"
VERSION=$(node -p "require('/app/package.json').version")
TAG="v${VERSION}"
WORK="/tmp/memara-wizard-tag-$$"
rm -rf "${WORK}"
mkdir -p "${WORK}"
cd "${WORK}"
G clone --depth 1 "${AUTH_REMOTE}" repo
cd repo
if G ls-remote --tags origin "refs/tags/${TAG}" | grep -q .; then
  echo "Tag ${TAG} already exists on origin."
  exit 0
fi
G tag -a "${TAG}" -m "Release ${TAG}"
G push origin "refs/tags/${TAG}"
EOS
)"
	log "GitHub tag push finished."
}

# Full release: CI → github-sync → github-tag → npm → GitHub Release (host curl).
publish_release() {
	local skip_confirm="${MEMARA_PUBLISH_SKIP_CONFIRM:-}"
	if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "-y" ]; then
		skip_confirm=1
	fi

	cd "$PACKAGE_ROOT" || error "Cannot cd to ${PACKAGE_ROOT}"

	local git_root
	git_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
	if [ -n "$git_root" ]; then
		local status
		if [ "$(cd "$git_root" && pwd -P)" = "$(cd "$PACKAGE_ROOT" && pwd -P)" ]; then
			status=$(git -C "$git_root" status --porcelain)
		elif [[ "$PACKAGE_ROOT" == "${git_root}/"* ]]; then
			local rel="${PACKAGE_ROOT#${git_root}/}"
			status=$(git -C "$git_root" status --porcelain -- "$rel")
		else
			warn "Package dir is not under git root ${git_root}; skipping dirty-tree check."
			status=""
		fi
		if [ -n "$status" ]; then
			echo "$status" >&2
			error "Working tree has uncommitted changes under the package path (see above)."
		fi
	fi

	if [ ! -f "${PACKAGE_ROOT}/.env.github" ] || [ ! -s "${PACKAGE_ROOT}/.env.github" ]; then
		error ".env.github missing or empty in ${PACKAGE_ROOT}"
	fi
	if [ ! -f "${PACKAGE_ROOT}/.env.npm" ] || [ ! -s "${PACKAGE_ROOT}/.env.npm" ]; then
		error ".env.npm missing or empty in ${PACKAGE_ROOT}"
	fi

	local version tag
	version=$(node -p "require('./package.json').version")
	tag="v${version}"

	if [ -z "$skip_confirm" ]; then
		read -p "Full release ${tag}: CI, GitHub sync+tag, npm publish, GitHub Release? (y/N): " -r response
		if [[ ! "$response" =~ ^[Yy]$ ]]; then
			log "Publish-release cancelled."
			return 0
		fi
	fi

	ci
	MEMARA_GITHUB_SKIP_CONFIRM=1 github_sync --yes
	MEMARA_GITHUB_SKIP_CONFIRM=1 github_tag --yes
	MEMARA_PUBLISH_SKIP_CONFIRM=1 publish --yes

	log "Creating GitHub Release for ${tag} on host..."
	local gh_pat owner_repo payload http_code body release_json
	export MEMARA_PAT_FILE="${PACKAGE_ROOT}/.env.github"
	gh_pat=$(node -e 'const fs=require("fs");const f=process.env.MEMARA_PAT_FILE;let t=fs.readFileSync(f,"utf8").trim();if(t.includes("=")&&!t.startsWith("ghp_")&&!t.startsWith("github_pat_")){const p=t.split("=",2);t=p.length===2?p[1].trim():t;}t=t.replace(/^["\x27]|["\x27]$/g,"");if(!t)process.exit(1);process.stdout.write(t);') || error "Could not read GitHub PAT"
	unset MEMARA_PAT_FILE

	owner_repo=$(node -p 'const p=require("./package.json");const u=p.repository?.url||"";const m=u.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\s*$/i); if(!m) process.exit(1); m[1]+"/"+m[2]') || error "Could not parse repository.url"

	release_json=$(mktemp "${TMPDIR:-/tmp}/memara-wizard-release.XXXXXX.json")
	export MEMARA_REL_VER="$version"
	payload=$(node -e 'const v=process.env.MEMARA_REL_VER;console.log(JSON.stringify({tag_name:"v"+v,name:"v"+v,generate_release_notes:true,body:"npm: https://www.npmjs.com/package/@memaraio/wizard/v/"+v}));') || error "Could not build release JSON"
	unset MEMARA_REL_VER

	http_code=$(curl -sSL -o "$release_json" -w "%{http_code}" \
		-X POST \
		-H "Authorization: Bearer ${gh_pat}" \
		-H "Accept: application/vnd.github+json" \
		-H "Content-Type: application/json" \
		-H "X-GitHub-Api-Version: 2022-11-28" \
		"https://api.github.com/repos/${owner_repo}/releases" \
		-d "$payload") || error "curl failed for GitHub Release"

	body=$(cat "$release_json")
	rm -f "$release_json"

	if [ "$http_code" != "201" ]; then
		error "GitHub Release API HTTP ${http_code}: ${body}"
	fi

	log "Publish-release finished: ${tag} on GitHub + npm + Release."
}

# Publish to npm (auth from bind-mounted .env.npm at /app/.env.npm)
publish() {
	log "Publishing Memara wizard to npm..."
	warn "Uses .env.npm in ${PACKAGE_ROOT} (mounted as /app in the container)."
	warn "Confirm package.json version is correct before continuing."

	local skip_confirm="${MEMARA_PUBLISH_SKIP_CONFIRM:-}"
	if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "-y" ]; then
		skip_confirm=1
	fi

	if [ -z "$skip_confirm" ]; then
		read -p "Continue? (y/N): " -r response
		if [[ ! "$response" =~ ^[Yy]$ ]]; then
			log "Publish cancelled."
			return 0
		fi
	fi

	ensure_dev_running

	log "Building and publishing (npm token from .env.npm, not printed)..."
	dc exec -T memara-wizard-dev sh -ec '
		cd /app
		if [ ! -f .env.npm ] || [ ! -s .env.npm ]; then
			echo "ERROR: /app/.env.npm is missing or empty. Create it in the package root on the host." >&2
			exit 1
		fi
		NPM_TOKEN=$(tr -d "\r\n" < .env.npm | sed "s/^[[:space:]]*//;s/[[:space:]]*$//")
		if [ -z "$NPM_TOKEN" ]; then
			echo "ERROR: .env.npm is empty after trimming." >&2
			exit 1
		fi
		NPMRC=$(mktemp)
		printf "%s\n" "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > "$NPMRC"
		npm run build
		npm run verify:pack
		npm publish --access public --userconfig "$NPMRC"
		rm -f "$NPMRC"
	'
	log "Publish finished (check output above for npm confirmation)."
}

# Show status
status() {
	log "Service status:"
	dc ps
}

# Clean up everything
clean() {
	warn "This will remove all containers and volumes. Are you sure? (y/N)"
	read -r response
	if [[ "$response" =~ ^[Yy]$ ]]; then
		dc down -v --remove-orphans
		docker system prune -f
		log "Cleanup completed!"
	else
		log "Cleanup cancelled."
	fi
}

# Execute command in development container
exec_dev() {
	ensure_dev_running
	if [ $# -eq 0 ]; then
		dc exec memara-wizard-dev sh
	else
		dc exec -T memara-wizard-dev "$@"
	fi
}

# Show help
show_help() {
	cat <<EOF
Memara Wizard Development Script

Usage: $0 [command] [options]

Commands:
    dev         Start development container
    stop        Stop services
    build       Build the CLI package
    test        Run unit tests
    publish     Build, verify:pack, and publish to npm (reads .env.npm from package directory)
    publish --yes   Same, skip confirmation (or set MEMARA_PUBLISH_SKIP_CONFIRM=1)
    github-verify-pat  Verify /app/.env.github PAT can GET the repo from package.json repository.url
    github-sync        Mirror /app into public GitHub main (ephemeral clone in container; needs .env.github)
    github-sync --yes  Same, skip confirmation (or MEMARA_GITHUB_SKIP_CONFIRM=1)
    github-tag         Push annotated tag v<version> from /app/package.json (needs .env.github)
    github-tag --yes   Same, skip confirmation
    publish-release    CI → github-sync → github-tag → npm publish → GitHub Release (.env.github + .env.npm)
    publish-release --yes   Same, skip confirmation (MEMARA_PUBLISH_SKIP_CONFIRM=1 also works)
    lint        Run TypeScript check (tsc --noEmit)
    ci          Run build, test, verify:pack, then lint
    pack        Run build then npm pack (tarball appears in package root)
    logs [svc]  Show logs (optionally for specific service)
    status      Show service status
    exec [cmd]  Execute command in dev container (or start shell)
    clean       Clean up all containers and volumes
    help        Show this help message

Publish requires a non-empty packages/memara-wizard/.env.npm (npm access token, one line).
GitHub mirror commands use .env.github inside the container; safe from monorepo (no nested .git).
publish-release checks uncommitted files under this package when inside a parent git repo.

Examples:
    $0 dev
    $0 ci
    $0 test
    $0 publish --yes
    $0 publish-release --yes
    $0 github-sync --yes
    $0 github-verify-pat
    $0 exec npm run lint
EOF
}

# Main script logic
main() {
	check_docker

	case "${1:-help}" in
	"dev")
		start_dev
		;;
	"test")
		test
		;;
	"stop")
		stop
		;;
	"build")
		build
		;;
	"publish")
		shift
		publish "$@"
		;;
	"publish-release")
		shift
		publish_release "$@"
		;;
	"github-verify-pat")
		github_verify_pat
		;;
	"github-sync")
		shift
		github_sync "$@"
		;;
	"github-tag")
		shift
		github_tag "$@"
		;;
	"lint")
		lint
		;;
	"ci")
		ci
		;;
	"pack")
		pack
		;;
	"logs")
		logs "$2"
		;;
	"status")
		status
		;;
	"exec")
		shift
		exec_dev "$@"
		;;
	"clean")
		clean
		;;
	"help" | "--help" | "-h")
		show_help
		;;
	*)
		error "Unknown command: $1. Use '$0 help' for usage information."
		;;
	esac
}

main "$@"
