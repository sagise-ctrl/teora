#!/usr/bin/env bash
# SOP-002b — cross-branch consistency check
# Scan SEMUA branch aktif untuk banned deps (deteksi divergen)
# Usage:
#   ./scripts/sop-cross-branch-consistency-check.sh --target main    # pre-merge gate
#   ./scripts/sop-cross-branch-consistency-check.sh --all           # daily cron, semua branch
# Exit 0 = semua branch clean, exit 1 = divergence detected, exit 2 = registry missing
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BANNED_FILE="$SCRIPT_DIR/../docs/ai-team/sops/banned-deps.json"
BANNED_FILE_JS=$(cygpath -w "$BANNED_FILE" 2>/dev/null | sed 's|\\|/|g' || echo "$BANNED_FILE")

MODE="--all"
if [[ "${1:-}" == "--target" && -n "${2:-}" ]]; then
  MODE="--target"
  TARGET_BRANCH="$2"
elif [[ "${1:-}" == "--all" ]]; then
  MODE="--all"
fi

if [[ ! -f "$BANNED_FILE" ]]; then
  echo "BANNED_DEPS_REGISTRY_MISSING: $BANNED_FILE" >&2
  exit 2
fi

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

# Dapatkan daftar branch
mapfile -t BRANCHES < <(git branch -a --format='%(refname:short)' 2>/dev/null | grep -v '^HEAD$' | sort -u)

if [[ "$MODE" == "--target" ]]; then
  # Pre-merge: cek semua branch yang BUKAN target
  FILTERED=()
  for b in "${BRANCHES[@]}"; do
    [[ "$b" == "$TARGET_BRANCH" || "$b" == "origin/$TARGET_BRANCH" ]] && continue
    FILTERED+=("$b")
  done
  BRANCHES=("${FILTERED[@]}")
  echo "PRE_MERGE_CHECK: scanning ${#BRANCHES[@]} branches (excluding $TARGET_BRANCH)"
else
  echo "FULL_CHECK: scanning ${#BRANCHES[@]} branches"
fi

EXIT=0

for branch in "${BRANCHES[@]}"; do
  # Ambil file tokenizer.ts dari branch ini (atau file kunci lain yang paling relevan)
  for file in "artifacts/api-server/src/lib/tokenizer.ts" "artifacts/api-server/src/lib/ai.ts"; do
    FILE_CONTENT=$(git show "$branch:$file" 2>/dev/null || echo "")

    while IFS= read -r dep; do
      [[ -z "$dep" ]] && continue

      # Cari import statement banned dep
      if echo "$FILE_CONTENT" | grep -qE "(from\s+['\"]${dep}['\"]|require\(['\"]${dep}['\"]\))"; then
        LINE_NUM=$(echo "$FILE_CONTENT" | grep -nE "(from\s+['\"]${dep}['\"]|require\(['\"]${dep}['\"]\))" | head -1 | cut -d: -f1)
        echo "BRANCH_DIVERGENCE: $branch has $dep at $file:$LINE_NUM" >&2
        EXIT=1
      fi
    done <<< "$DEPS"
  done
done

if [[ $EXIT -eq 0 ]]; then
  echo "CROSS_BRANCH_OK: tidak ada banned deps di branch aktif"
fi

exit $EXIT
