const USER_ID_KEY = 'stepwords-user-id';

function generateId() {
  return 'sw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

export function getOrCreateUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id || typeof id !== 'string') {
      id = generateId();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

const MODE_MAP = {
  stepwords: 'main',
  quickstep: 'quick',
  otherstep: 'other',
};

export function modeFromNamespace(ns) {
  return MODE_MAP[ns] || 'main';
}

export async function submitRating(puzzleId, mode, rating, userId) {
  const res = await fetch('/api/rate-puzzle.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzle_id: puzzleId, mode, rating, user_id: userId }),
  });
  if (!res.ok) throw new Error('Failed to save rating');
  return res.json();
}

export async function getRatings(puzzleId = null, mode = null) {
  const params = new URLSearchParams();
  if (puzzleId) params.set('puzzle_id', puzzleId);
  if (mode) params.set('mode', mode);
  const url = '/api/get-ratings.php' + (params.toString() ? '?' + params.toString() : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch ratings');
  return res.json();
}
