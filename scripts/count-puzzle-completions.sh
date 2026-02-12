#!/usr/bin/env bash
# Count puzzle completions from stepwords-puzzle-completions.log
# Log path: sys_get_temp_dir()/stepwords-puzzle-completions.log (typically /tmp/ on Linux, /var/folders/... on macOS)
# Dates are interpreted in Eastern Time (America/New_York).

set -e

FILTER_DATE=""
LOG_FILE=""
DEBUG=""

# Parse args: [date] [path] or [path], and --debug
for arg in "$@"; do
  if [[ "$arg" == "--debug" ]]; then
    DEBUG=1
  elif [[ "$arg" == "today" ]]; then
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
  echo "Usage: $0 [YYYY-MM-DD|today] [path-to-log] [--debug]" >&2
  echo "  Date is optional; counts all time if omitted. Use 'today' or YYYY-MM-DD (ET)." >&2
  echo "  --debug: show sample ts->date conversions and skip counts." >&2
  echo "  Default log: /tmp/stepwords-puzzle-completions.log" >&2
  exit 1
fi

# Convert Unix timestamp to ET date (YYYY-MM-DD)
# Handles both seconds and milliseconds (if > 10^10, treat as ms)
# macOS: date -r. Linux: date -d @
ts_to_et_date() {
  local ts="$1"
  # If timestamp is in milliseconds (> ~year 2286 in sec), convert to seconds
  if [[ "$ts" =~ ^[0-9]+$ && "$ts" -gt 10000000000 ]]; then
    ts=$(( ts / 1000 ))
  fi
  if TZ=America/New_York date -r "$ts" +%Y-%m-%d 2>/dev/null; then
    return
  fi
  TZ=America/New_York date -d "@$ts" +%Y-%m-%d 2>/dev/null
}

# Filter by date if requested
if [[ -n "$FILTER_DATE" ]]; then
  FILTERED=$(mktemp)
  trap 'rm -f "$FILTERED"' EXIT
  MATCH_COUNT=0
  SKIP_TS_EMPTY=0
  SKIP_TS_FAIL=0
  DATE_SAMPLES=""
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    # Extract ts: support both "ts":123 and "ts": 123 (optional spaces)
    ts=$(echo "$line" | grep -oE '"ts"[[:space:]]*:[[:space:]]*[0-9]+' | grep -oE '[0-9]+$')
    if [[ -z "$ts" ]]; then
      SKIP_TS_EMPTY=$(( SKIP_TS_EMPTY + 1 ))
      continue
    fi
    et_date=$(ts_to_et_date "$ts" 2>/dev/null) || { SKIP_TS_FAIL=$(( SKIP_TS_FAIL + 1 )); continue; }
    if [[ -n "$DEBUG" && ${#DATE_SAMPLES} -lt 500 ]]; then
      DATE_SAMPLES="${DATE_SAMPLES}ts=${ts} -> ${et_date}"$'\n'
    fi
    if [[ "$et_date" == "$FILTER_DATE" ]]; then
      echo "$line" >> "$FILTERED"
      MATCH_COUNT=$(( MATCH_COUNT + 1 ))
    fi
  done < "$LOG_FILE"
  SOURCE="$FILTERED"
  DATE_LABEL=" (ET $FILTER_DATE)"
  if [[ -n "$DEBUG" ]]; then
    echo "Debug: Filtering for ET date $FILTER_DATE" >&2
    echo "Debug: Sample ts -> ET date conversions (first 10):" >&2
    echo -e "$DATE_SAMPLES" | head -10 >&2
    echo "Debug: Skipped (no ts): $SKIP_TS_EMPTY, (ts parse failed): $SKIP_TS_FAIL" >&2
    echo "Debug: Matches for $FILTER_DATE: $MATCH_COUNT" >&2
  fi
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
