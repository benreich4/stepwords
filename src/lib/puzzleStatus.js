import { getTodayIsoInET, isPreviewEnabled } from "./date.js";

/** Shared puzzle completion / progress status for calendar UIs. */

/** Latest puzzle in manifest that is available today (ET). */
export function pickTodayPuzzle(manifest) {
  const today = getTodayIsoInET();
  const preview = isPreviewEnabled();
  const available = (manifest || []).filter((p) => p?.date && (preview || p.date <= today));
  if (!available.length) return null;
  return available.sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
}

export function readSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]").map(String));
  } catch {
    return new Set();
  }
}

export function readMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export function hasProgress(ns, id) {
  try {
    const s = JSON.parse(localStorage.getItem(`${ns}-${id}`) || "null");
    if (!s) return false;
    if (s.guessCount > 0 || s.hintCount > 0 || s.wrongGuessCount > 0) return true;
    if (Array.isArray(s.guesses) && s.guesses.some((g) => (g || "").trim().length > 0)) return true;
    if (Array.isArray(s.lockColors) && s.lockColors.some((row) => Array.isArray(row) && row.some(Boolean))) return true;
    if (typeof s.level === "number" && s.level > 0) return true;
    return false;
  } catch {
    return false;
  }
}

/** Resolve visual status of a single main or quick puzzle cell. */
export function cellStatus(ns, id, completed, stars, perfect) {
  const idStr = String(id);
  const solved = completed.has(idStr) || completed.has(id);
  const score = stars[idStr] ?? stars[id];
  const isPerfect = perfect.has(idStr) || perfect.has(id);
  const failed = Number.isFinite(score) && score === 0 && !solved;
  let icon = null;
  if (failed) icon = "❌";
  else if (Number.isFinite(score)) icon = isPerfect ? "🤩" : score === 3 ? "🌟" : score === 2 ? "⭐️" : score === 1 ? "💫" : "☆";
  else if (solved) icon = isPerfect ? "🤩" : "⭐️";
  else if (hasProgress(ns, id)) icon = "👟";
  return { solved, failed, icon };
}
