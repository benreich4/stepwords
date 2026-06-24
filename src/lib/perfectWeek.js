import { getTodayIsoInET, getWeekKeyET, getWeekDatesFromKey } from './date.js';

const WEEK_STARS_KEY = 'stepwords-week-stars';
const PERFECT_WEEKS_KEY = 'stepwords-perfect-weeks-achieved';

function readWeekStars() {
  try {
    return JSON.parse(localStorage.getItem(WEEK_STARS_KEY) || '{}');
  } catch {
    return {};
  }
}

function readPerfectWeeks() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PERFECT_WEEKS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/** Record a main daily solve's star count for perfect-week tracking. */
export function recordMainDailyStars(puzzleDate, stars) {
  if (!puzzleDate || !Number.isFinite(stars)) return null;
  try {
    const weekKey = getWeekKeyET(puzzleDate);
    const all = readWeekStars();
    const week = { ...(all[weekKey] || {}) };
    week[puzzleDate] = Math.max(week[puzzleDate] || 0, stars);
    all[weekKey] = week;
    localStorage.setItem(WEEK_STARS_KEY, JSON.stringify(all));
    return checkPerfectWeek(weekKey, week);
  } catch {
    return null;
  }
}

function checkPerfectWeek(weekKey, weekMap) {
  const dates = getWeekDatesFromKey(weekKey);
  const perfect = dates.every((d) => (weekMap[d] || 0) >= 3);
  if (!perfect) {
    return { perfect: false, weekKey, daysDone: dates.filter((d) => (weekMap[d] || 0) >= 3).length };
  }
  const achieved = readPerfectWeeks();
  const isNew = !achieved.has(weekKey);
  if (isNew) {
    achieved.add(weekKey);
    localStorage.setItem(PERFECT_WEEKS_KEY, JSON.stringify(Array.from(achieved)));
  }
  return { perfect: true, weekKey, isNew };
}

export function getPerfectWeekProgress(dateIso = getTodayIsoInET()) {
  const weekKey = getWeekKeyET(dateIso);
  const weekMap = readWeekStars()[weekKey] || {};
  const dates = getWeekDatesFromKey(weekKey);
  const daysDone = dates.filter((d) => (weekMap[d] || 0) >= 3).length;
  return { weekKey, daysDone, total: 7, achieved: readPerfectWeeks().has(weekKey) };
}

export function getPerfectWeekCount() {
  return readPerfectWeeks().size;
}
