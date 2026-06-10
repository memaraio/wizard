#!/bin/bash
# Thin wrapper: full release from package root (CI → GitHub sync → tag → npm → Release).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/docker-wizard.sh" publish-release "$@"
