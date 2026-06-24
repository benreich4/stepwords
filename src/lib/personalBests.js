const TIMES_KEY = (ns) => `${ns}-times`;

function readTimes(ns) {
  try {
    return JSON.parse(localStorage.getItem(TIMES_KEY(ns)) || '{}');
  } catch {
    return {};
  }
}

function readMs(entry) {
  if (typeof entry === 'number' && entry > 0) return entry;
  if (entry && typeof entry === 'object' && Number.isFinite(entry.elapsedMs) && entry.elapsedMs > 0) {
    return entry.elapsedMs;
  }
  return null;
}

export function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Compare a new solve time against stored bests. Returns highlight strings. */
export function getPersonalBestHighlights(puzzleNamespace, puzzleId, elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return [];

  const map = readTimes(puzzleNamespace);
  const id = String(puzzleId);
  const prevForPuzzle = readMs(map[id]);
  const highlights = [];

  let globalBest = Infinity;
  for (const [key, val] of Object.entries(map)) {
    if (key === id) continue;
    const ms = readMs(val);
    if (ms != null) globalBest = Math.min(globalBest, ms);
  }

  if (prevForPuzzle != null && elapsedMs < prevForPuzzle) {
    highlights.push(`New best time for this puzzle (${formatMs(elapsedMs)})`);
  }
  if (globalBest !== Infinity && elapsedMs < globalBest) {
    highlights.push(`New fastest ${puzzleNamespace === 'quickstep' ? 'Quick' : 'Daily'} solve!`);
  }

  return highlights;
}
