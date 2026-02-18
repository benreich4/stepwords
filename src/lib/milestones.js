/**
 * Milestone/badge tracking and celebration utilities
 */

import { ALL_BADGES, FIRST_SOLVE_BADGE, getAchievedBadges } from './badges.js';

const BADGES_KEY = 'stepwords-badges-achieved';
const OLD_MILESTONES_KEY = 'stepwords-milestones-achieved';

function migrateOldMilestones(achieved) {
  try {
    const old = JSON.parse(localStorage.getItem(OLD_MILESTONES_KEY) || '[]');
    if (Array.isArray(old) && old.length > 0) {
      old.forEach((k) => achieved.add(k));
      localStorage.removeItem(OLD_MILESTONES_KEY);
    }
  } catch {}
}

function recordHintUsage(lifelinesUsed, lifelineLevel, wordRevealed, letterRevealedUsed) {
  try {
    const key = 'stepwords-hints-used';
    const used = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    if (lifelineLevel > 0) used.add('hint-word-starts');
    if (lifelinesUsed?.first3) used.add('hint-first3');
    if (lifelinesUsed?.last3) used.add('hint-last3');
    if (lifelinesUsed?.middle3) used.add('hint-middle3');
    if (lifelinesUsed?.firstLastStep) used.add('hint-first-last-step');
    if (letterRevealedUsed) used.add('hint-reveal-letter');
    if (wordRevealed) used.add('hint-reveal-word');
    localStorage.setItem(key, JSON.stringify(Array.from(used)));
  } catch {}
}

function getPerfectCount() {
  try {
    const main = JSON.parse(localStorage.getItem('stepwords-perfect') || '[]');
    const quick = JSON.parse(localStorage.getItem('quickstep-perfect') || '[]');
    return main.length + quick.length;
  } catch {
    return 0;
  }
}

function getFastestTimeMs() {
  try {
    const mainTimes = JSON.parse(localStorage.getItem('stepwords-times') || '{}');
    const quickTimes = JSON.parse(localStorage.getItem('quickstep-times') || '{}');
    const allTimes = [];

    const extract = (map) => {
      for (const v of Object.values(map || {})) {
        const ms = v && typeof v === 'object' && Number.isFinite(v.elapsedMs) ? v.elapsedMs : (typeof v === 'number' ? v : null);
        if (Number.isFinite(ms) && ms > 0) allTimes.push(ms);
      }
    };
    extract(mainTimes);
    extract(quickTimes);
    return allTimes.length ? Math.min(...allTimes) : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * Check all badges and return newly achieved ones (for popup)
 * Only call on puzzle complete.
 */
export function checkMilestones(puzzleId, isQuick, stats, puzzleNamespace) {
  const newlyAchieved = [];

  try {
    const mainCompleted = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
    const quickCompleted = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
    const totalCompleted = mainCompleted.length + quickCompleted.length;

    const streakKey = isQuick ? 'stepwords-streak-quick' : 'stepwords-streak-main';
    const streakData = JSON.parse(localStorage.getItem(streakKey) || '{}');
    const currentStreak = streakData.current || 0;

    let perfectCount = getPerfectCount();
    if (stats?.isPerfect) perfectCount += 1;
    const elapsedMs = stats?.elapsedMs;
    const fastestMs = getFastestTimeMs();
    // Include current completion time (not yet saved) when checking speed badges
    const effectiveFastest = Number.isFinite(elapsedMs) && elapsedMs > 0
      ? Math.min(fastestMs, elapsedMs)
      : fastestMs;

    // Record hint usage from this completion
    recordHintUsage(
      stats?.lifelinesUsed,
      stats?.lifelineLevel,
      stats?.wordRevealed,
      stats?.letterRevealedUsed
    );

    const hintsUsed = new Set(JSON.parse(localStorage.getItem('stepwords-hints-used') || '[]'));

    let achieved = getAchievedBadges();
    migrateOldMilestones(achieved);

    const checks = [
      { key: 'first-solve', condition: totalCompleted === 1 },
      { key: '10-solves', condition: totalCompleted >= 10 },
      { key: '25-solves', condition: totalCompleted >= 25 },
      { key: '50-solves', condition: totalCompleted >= 50 },
      { key: '100-solves', condition: totalCompleted >= 100 },
      { key: '3-day-streak', condition: currentStreak >= 3 },
      { key: '7-day-streak', condition: currentStreak >= 7 },
      { key: '14-day-streak', condition: currentStreak >= 14 },
      { key: '30-day-streak', condition: currentStreak >= 30 },
      { key: 'speed-5min', condition: effectiveFastest < 5 * 60 * 1000 },
      { key: 'speed-2min', condition: effectiveFastest < 2 * 60 * 1000 },
      { key: 'speed-1min', condition: effectiveFastest < 60 * 1000 },
      { key: 'speed-30sec', condition: effectiveFastest < 30 * 1000 },
      { key: '10-perfects', condition: perfectCount >= 10 },
      { key: '25-perfects', condition: perfectCount >= 25 },
      { key: '50-perfects', condition: perfectCount >= 50 },
      { key: '100-perfects', condition: perfectCount >= 100 },
      { key: 'hint-word-starts', condition: hintsUsed.has('hint-word-starts') },
      { key: 'hint-first3', condition: hintsUsed.has('hint-first3') },
      { key: 'hint-last3', condition: hintsUsed.has('hint-last3') },
      { key: 'hint-middle3', condition: hintsUsed.has('hint-middle3') },
      { key: 'hint-first-last-step', condition: hintsUsed.has('hint-first-last-step') },
      { key: 'hint-reveal-letter', condition: hintsUsed.has('hint-reveal-letter') },
      { key: 'hint-reveal-word', condition: hintsUsed.has('hint-reveal-word') },
    ];

    for (const { key, condition } of checks) {
      if (condition && !achieved.has(key)) {
        achieved.add(key);
        const def = getBadgeDef(key);
        newlyAchieved.push({
          key,
          message: def.message,
          emoji: def.emoji,
        });
      }
    }

    if (newlyAchieved.length > 0) {
      localStorage.setItem(BADGES_KEY, JSON.stringify(Array.from(achieved)));
    }
  } catch (error) {
    console.warn('Error checking milestones:', error);
  }

  return newlyAchieved;
}

function getBadgeDef(key) {
  if (key === 'first-solve') {
    return { message: `${FIRST_SOLVE_BADGE.emoji} First puzzle solved!`, emoji: FIRST_SOLVE_BADGE.emoji };
  }
  const def = ALL_BADGES.find((b) => b.key === key);
  const cat = def?.category;
  const emoji = cat === 'solves' ? '🏆' : cat === 'streak' ? '🔥' : cat === 'speed' ? '⏱️' : cat === 'perfects' ? '✨' : cat === 'hints' ? '💡' : '🏅';
  const msg = def?.description || key;
  return { message: `${emoji} ${msg}`, emoji };
}

export function checkPerfectSolve(hintCount, wrongGuessCount) {
  return hintCount === 0 && wrongGuessCount === 0;
}
