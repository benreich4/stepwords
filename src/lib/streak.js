/**
 * Streak tracking utilities - NYT Crossword style
 *
 * Rules:
 * - Must solve TODAY's puzzle (not any puzzle)
 * - Must solve before midnight ET (completion happens at solve time)
 * - Streak only continues if you solve TODAY's puzzle on consecutive days
 * - If you miss a day, streak resets
 * - Separate streaks for main and quick puzzles
 */

import { getTodayIsoInET, calendarDaysBetween } from './date.js';
import { isPuzzleIdInList, isPuzzleSolved } from './puzzleStatus.js';

const MAIN_STREAK_KEY = 'stepwords-streak-main';
const QUICK_STREAK_KEY = 'stepwords-streak-quick';
const MAIN_LAST_PLAY_DATE_KEY = 'stepwords-last-play-date-main';
const QUICK_LAST_PLAY_DATE_KEY = 'stepwords-last-play-date-quick';

export function getStreak(isQuick = false) {
  try {
    const streakKey = isQuick ? QUICK_STREAK_KEY : MAIN_STREAK_KEY;
    const streakData = localStorage.getItem(streakKey);
    if (!streakData) return { current: 0, longest: 0 };
    const parsed = JSON.parse(streakData);
    return {
      current: parsed.current || 0,
      longest: typeof parsed.longest === 'number' ? parsed.longest : (parsed.current || 0)
    };
  } catch {
    return { current: 0, longest: 0 };
  }
}

export function getAllStreaks() {
  return {
    main: getStreak(false),
    quick: getStreak(true),
  };
}

/**
 * Streak for UI display. Reads stored streak but returns current: 0 when
 * nothing in the recent calendar shows as solved — avoids streak 1 with empty
 * week stars from stale storage. Does not modify localStorage.
 */
export function getDisplayStreak(isQuick, { completed, stars, times, recentDates, puzzlesByDate }) {
  const stored = getStreak(isQuick);
  if (stored.current === 0) return stored;

  const dates = recentDates || [];
  const byDate = puzzlesByDate || new Map();
  const hasVisibleSolve = dates.some((iso) => {
    const puzzle = byDate.get(iso);
    if (!puzzle) return false;
    return isPuzzleSolved(puzzle.id, completed, stars, times);
  });

  if (hasVisibleSolve) return stored;

  return { ...stored, current: 0 };
}

function normalizePuzzleDate(puzzleDate) {
  if (!puzzleDate) return '';
  return typeof puzzleDate === 'string' ? puzzleDate.split('T')[0] : String(puzzleDate);
}

/** Puzzle date matches today's calendar day in ET. */
function isTodayPuzzle(puzzleDate) {
  const puzzleDateStr = normalizePuzzleDate(puzzleDate);
  if (!puzzleDateStr) return false;
  try {
    return puzzleDateStr === getTodayIsoInET();
  } catch {
    return false;
  }
}

/**
 * Resolve puzzle date for streak counting.
 * Quick puzzle JSON files omit date; manifest supplies it at load time.
 */
export function resolveStreakPuzzleDate(puzzleDate) {
  return normalizePuzzleDate(puzzleDate) || getTodayIsoInET();
}

function writeStreak(isQuick, current, longest, today) {
  const streakKey = isQuick ? QUICK_STREAK_KEY : MAIN_STREAK_KEY;
  const lastPlayDateKey = isQuick ? QUICK_LAST_PLAY_DATE_KEY : MAIN_LAST_PLAY_DATE_KEY;
  const data = { current, longest: Math.max(current, longest) };
  localStorage.setItem(streakKey, JSON.stringify(data));
  localStorage.setItem(lastPlayDateKey, today);
  return data;
}

/**
 * Mark puzzle completed, then update streak — only when newly completed.
 * Completed is saved first so last-play-date cannot get ahead of -completed.
 */
export function completePuzzleAndUpdateStreak({ puzzleDate, puzzleId, namespace, isQuick = false }) {
  const ns = namespace || (isQuick ? 'quickstep' : 'stepwords');
  const id = puzzleId != null ? String(puzzleId) : null;
  let completed = [];

  try {
    completed = JSON.parse(localStorage.getItem(`${ns}-completed`) || '[]');
    if (id && isPuzzleIdInList(completed, id)) {
      return { streak: getStreak(isQuick), newlyCompleted: false };
    }
  } catch {}

  const hadPriorCompletions = completed.length > 0;

  try {
    if (id && !isPuzzleIdInList(completed, id)) {
      completed.push(id);
      localStorage.setItem(`${ns}-completed`, JSON.stringify(completed));
    }
  } catch {
    return { streak: getStreak(isQuick), newlyCompleted: false };
  }

  const streak = updateStreak(resolveStreakPuzzleDate(puzzleDate), isQuick, {
    freshCompletion: true,
    hadPriorCompletions,
  });
  return { streak, newlyCompleted: true };
}

/**
 * Update streak when solving today's puzzle for the first time today.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.freshCompletion] - caller just added this puzzle to -completed
 * @param {boolean} [opts.hadPriorCompletions] - other puzzles were already in -completed
 */
export function updateStreak(puzzleDate, isQuick = false, opts = {}) {
  const { freshCompletion = false, hadPriorCompletions = false } = opts;

  try {
    if (!isTodayPuzzle(puzzleDate)) {
      return getStreak(isQuick);
    }

    const today = getTodayIsoInET();
    const lastPlayDateKey = isQuick ? QUICK_LAST_PLAY_DATE_KEY : MAIN_LAST_PLAY_DATE_KEY;
    const lastPlayDate = localStorage.getItem(lastPlayDateKey);
    const streakData = getStreak(isQuick);
    const current = streakData.current || 0;
    const currentLongest = typeof streakData.longest === 'number' ? streakData.longest : current;

    const gap = lastPlayDate ? calendarDaysBetween(lastPlayDate, today) : null;

    // Already counted today — unless stale state from older builds (see below).
    if (gap === 0) {
      if (freshCompletion && hadPriorCompletions) {
        // last-play-date says today but this puzzle wasn't in -completed until now,
        // and the player has older solves — treat as the missing consecutive-day bump.
        return writeStreak(isQuick, current + 1, currentLongest, today);
      }
      return streakData;
    }

    let newCurrent = 1;

    if (gap === 1) {
      // Played yesterday — extend streak (original: lastPlayDate === yesterdayStr)
      newCurrent = current + 1;
    } else if (gap !== null && gap > 1) {
      // Missed one or more days
      newCurrent = 1;
    } else if (gap !== null && gap < 0) {
      newCurrent = 1;
    } else if (gap === null) {
      // First tracked solve (original: !lastPlayDate)
      newCurrent = 1;
    }

    return writeStreak(isQuick, newCurrent, currentLongest, today);
  } catch (error) {
    console.warn('Error updating streak:', error);
    return getStreak(isQuick);
  }
}

export function getStreakDisplay(streak) {
  if (streak.current === 0) return 'Start your streak!';
  if (streak.current === 1) return '🔥 1 day streak';
  return `🔥 ${streak.current} day streak`;
}
