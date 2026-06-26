/**
 * Streak tracking utilities - NYT Crossword style
 *
 * Rules:
 * - Must solve TODAY's puzzle (not any puzzle)
 * - Must solve before midnight ET
 * - Streak only continues if you solve TODAY's puzzle on consecutive days
 * - If you miss a day, streak resets
 * - Separate streaks for main and quick puzzles
 */

import { getTodayIsoInET, calendarDaysBetween } from './date.js';

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
    // Ensure longest is always defined (migration for old data)
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
 * Check if a puzzle date is today's puzzle (in ET timezone)
 */
function isTodayPuzzle(puzzleDate) {
  if (!puzzleDate) return false;
  try {
    const today = getTodayIsoInET();
    // Normalize puzzle date to ISO format (YYYY-MM-DD)
    const puzzleDateStr = typeof puzzleDate === 'string'
      ? puzzleDate.split('T')[0] // Handle ISO datetime strings
      : puzzleDate;

    return puzzleDateStr === today;
  } catch {
    return false;
  }
}

/**
 * Update streak when solving a puzzle
 * Rules:
 * - Every day when you solve a puzzle before midnight ET, the streak increments by 1
 * - If you fail to do so (miss a day), it resets to 1
 * - Only counts if solving TODAY's puzzle
 */
export function updateStreak(puzzleDate, isQuick = false) {
  try {
    // Only count if this is today's puzzle
    if (!isTodayPuzzle(puzzleDate)) {
      return getStreak(isQuick);
    }

    const today = getTodayIsoInET();
    const lastPlayDateKey = isQuick ? QUICK_LAST_PLAY_DATE_KEY : MAIN_LAST_PLAY_DATE_KEY;
    const lastPlayDate = localStorage.getItem(lastPlayDateKey);
    const streakData = getStreak(isQuick);
    const currentLongest = typeof streakData.longest === 'number' ? streakData.longest : (streakData.current || 0);

    const gap = lastPlayDate ? calendarDaysBetween(lastPlayDate, today) : null;

    // Already counted today
    if (gap === 0) {
      return streakData;
    }

    let newCurrent = 1;

    if (gap === 1) {
      // Played yesterday — extend streak
      newCurrent = (streakData.current || 0) + 1;
    } else if (gap !== null && gap > 1) {
      // Missed one or more days
      newCurrent = 1;
    } else if (gap !== null && gap < 0) {
      // last-play-date in the future (clock skew / bad data)
      newCurrent = 1;
    } else if (gap === null) {
      // Legacy saves may have a streak count but no last-play-date
      newCurrent = (streakData.current || 0) > 0 ? (streakData.current || 0) + 1 : 1;
    }

    const newLongest = Math.max(newCurrent, currentLongest);
    const newStreakData = { current: newCurrent, longest: newLongest };

    const streakKey = isQuick ? QUICK_STREAK_KEY : MAIN_STREAK_KEY;
    localStorage.setItem(streakKey, JSON.stringify(newStreakData));
    localStorage.setItem(lastPlayDateKey, today);

    return newStreakData;
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
