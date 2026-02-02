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

import { getTodayIsoInET } from './date.js';

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
 * Check if it's before midnight ET
 */
function isBeforeMidnightET() {
  try {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const seconds = etTime.getSeconds();
    
    // Before midnight means hours < 24 (which is always true, but we check if it's still the same calendar day)
    // Actually, we just need to check if we're still on the same day
    // The real check is: did we solve today's puzzle before midnight?
    // Since we're checking completion, we assume it's happening "now" which is before midnight
    return true; // If we're completing a puzzle, it's happening now, which is before midnight
  } catch {
    return true; // Default to true to not break streaks
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
      return getStreak(isQuick); // Return current streak without updating
    }
    
    // Check if it's before midnight ET
    if (!isBeforeMidnightET()) {
      return getStreak(isQuick); // Too late, don't count
    }
    
    const today = getTodayIsoInET();
    const lastPlayDateKey = isQuick ? QUICK_LAST_PLAY_DATE_KEY : MAIN_LAST_PLAY_DATE_KEY;
    const lastPlayDate = localStorage.getItem(lastPlayDateKey);
    const streakData = getStreak(isQuick);
    
    // Ensure longest is defined (handle old data)
    const currentLongest = typeof streakData.longest === 'number' ? streakData.longest : (streakData.current || 0);
    
    // If already completed today's puzzle, don't update again
    if (lastPlayDate === today) {
      return streakData;
    }
    
    // Calculate yesterday's date in ET
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/New_York', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(yesterday);
    
    let newCurrent = 1;
    
    // If we solved yesterday's puzzle, continue the streak
    if (lastPlayDate === yesterdayStr) {
      // Consecutive day - increment streak
      newCurrent = (streakData.current || 0) + 1;
    } else if (lastPlayDate && lastPlayDate < yesterdayStr) {
      // Last play was more than 1 day ago - missed a day, reset to 1
      newCurrent = 1;
    } else if (!lastPlayDate) {
      // First time solving - start streak at 1
      newCurrent = 1;
    }
    // If lastPlayDate === today, we already returned above
    
    // Always update longest to be the maximum of current longest and new current streak
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
