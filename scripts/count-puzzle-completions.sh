#!/usr/bin/env bash
# Count puzzle completions from stepwords-puzzle-completions.log
# Log path: sys_get_temp_dir()/stepwords-puzzle-completions.log (typically /tmp/ on Linux, /var/folders/... on macOS)
# Dates are interpreted in Eastern Time (America/New_York).

set -e

FILTER_DATE=""
LOG_FILE=""

# Parse args: [date] [path] or [path]
# Date: YYYY-MM-DD or "today". Path: path to log file.
for arg in "$@"; do
  if [[ "$arg" == "today" ]]; then
    FILTER_DATE=$(TZ=America/New_York date +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)
  elif [[ "$arg" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    FILTER_DATE="$arg"
  elif [[ -f "$arg" || "$arg" == */* ]]; then
    LOG_FILE="$arg"
  fi
done

# Resolve log file if not given
if [[ -z "$LOG_FILE" ]]; then
  for candidate in \
    /tmp/stepwords-puzzle-completions.log \
    "${TMPDIR:-/tmp}/stepwords-puzzle-completions.log"
  do
    if [[ -f "$candidate" ]]; then
      LOG_FILE="$candidate"
      break
    fi
  done
fi

if [[ -z "$LOG_FILE" || ! -f "$LOG_FILE" ]]; then
  echo "Log file not found: ${LOG_FILE:-<no candidates found>}" >&2
  echo "Usage: $0 [YYYY-MM-DD|today] [path-to-log]" >&2
  echo "  Date is optional; counts all time if omitted. Use 'today' or YYYY-MM-DD (ET)." >&2
  echo "  Default log: /tmp/stepwords-puzzle-completions.log" >&2
  exit 1
fi

# Convert Unix timestamp to ET date (YYYY-MM-DD)
# macOS: date -r. Linux: date -d @
ts_to_et_date() {
  local ts="$1"
  if TZ=America/New_York date -r "$ts" +%Y-%m-%d 2>/dev/null; then
    return
  fi
  TZ=America/New_York date -d "@$ts" +%Y-%m-%d 2>/dev/null
}

# Filter by date if requested
if [[ -n "$FILTER_DATE" ]]; then
  FILTERED=$(mktemp)
  trap 'rm -f "$FILTERED"' EXIT
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    ts=$(echo "$line" | grep -oE '"ts":[0-9]+' | grep -oE '[0-9]+')
    [[ -z "$ts" ]] && continue
    et_date=$(ts_to_et_date "$ts" 2>/dev/null) || continue
    if [[ "$et_date" == "$FILTER_DATE" ]]; then
      echo "$line" >> "$FILTERED"
    fi
  done < "$LOG_FILE"
  SOURCE="$FILTERED"
  DATE_LABEL=" (ET $FILTER_DATE)"
else
  SOURCE="$LOG_FILE"
  DATE_LABEL=""
fi

TOTAL=$(wc -l < "$SOURCE" | tr -d ' ')
echo "Total completions${DATE_LABEL}: $TOTAL"

if command -v jq &>/dev/null; then
  echo ""
  echo "By mode:"
  jq -r '.mode // "unknown"' "$SOURCE" 2>/dev/null | sort | uniq -c | sort -rn
fi
