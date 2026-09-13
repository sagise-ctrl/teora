#!/usr/bin/env bash
# SOP-002c — pre-deploy banned-deps check
# Scan working tree saat ini untuk banned deps dari .ai/sops/banned-deps.json
# Exit 0 = clean, exit 1 = banned dep found (BLOCK deploy), exit 2 = registry missing
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BANNED_FILE="$SCRIPT_DIR/../docs/ai-team/sops/banned-deps.json"

# Convert to forward-slash absolute path (Node.js require butuh forward slash di Windows)
BANNED_FILE_JS=$(cygpath -w "$BANNED_FILE" 2>/dev/null | sed 's|\\|/|g' || echo "$BANNED_FILE")

if [[ ! -f "$BANNED_FILE" ]]; then
  echo "BANNED_DEPS_REGISTRY_MISSING: $BANNED_FILE" >&2
  echo "Buat registry dulu atau pull latest .ai/" >&2
  exit 2
fi

# Extract dep names dari JSON (assume Node.js tersedia — Vercel project selalu punya)
DEPS=$(node -e "
  const r = require('$BANNED_FILE_JS');
  process.stdout.write(r.deps.map(d => d.name).join('\n'));
" 2>/dev/null) || {
  echo "NODE_PARSE_FAILED: tidak bisa parse $BANNED_FILE" >&2
  exit 2
}

if [[ -z "$DEPS" ]]; then
  echo "BANNED_DEPS_REGISTRY_EMPTY: $BANNED_FILE" >&2
  exit 2
fi

EXIT=0
SCAN_PATHS=("artifacts/api-server/src/" "artifacts/api-server/api/")

while IFS= read -r dep; do
  [[ -z "$dep" ]] && continue

  for scan_path in "${SCAN_PATHS[@]}"; do
    [[ ! -d "$scan_path" ]] && continue

    # Match import statements: from "tiktoken", from 'tiktoken', require("tiktoken")
    HITS=$(git grep -nE "(from\s+['\"]${dep}['\"]|require\(['\"]${dep}['\"]\))" -- "$scan_path" 2>/dev/null || true)

    if [[ -n "$HITS" ]]; then
      echo "BANNED_DEP_FOUND: $dep" >&2
      echo "$HITS" >&2
      EXIT=1
    fi
  done
done <<< "$DEPS"

if [[ $EXIT -eq 0 ]]; then
  echo "PRE_DEPLOY_OK: tidak ada banned deps di working tree"
fi

exit $EXIT
