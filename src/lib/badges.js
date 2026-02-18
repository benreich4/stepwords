/**
 * Badge definitions and utilities
 * Each category uses the same emoji with different colors for tiers
 */

export const BADGE_CATEGORIES = {
  first: { emoji: '🎉', label: 'First solve' },
  solves: { emoji: '🏆', label: 'Puzzles solved' },
  streak: { emoji: '🔥', label: 'Streak' },
  speed: { emoji: '⏱️', label: 'Speed' },
  perfects: { emoji: '✨', label: 'Perfect solves' },
  hints: { emoji: '💡', label: 'Hint types used' },
};

// Colors per tier within a category (4 tiers: bronze/silver/gold/platinum)
const TIER_COLORS = [
  'text-amber-600',   // tier 0
  'text-amber-500',   // tier 1
  'text-yellow-400',  // tier 2
  'text-cyan-300',    // tier 3
];

const GRAY = 'text-gray-500 opacity-60';

export const ALL_BADGES = [
  // Solves: 10, 25, 50, 100
  { key: '10-solves', category: 'solves', tier: 0, threshold: 10, description: '10 puzzles solved' },
  { key: '25-solves', category: 'solves', tier: 1, threshold: 25, description: '25 puzzles solved' },
  { key: '50-solves', category: 'solves', tier: 2, threshold: 50, description: '50 puzzles solved' },
  { key: '100-solves', category: 'solves', tier: 3, threshold: 100, description: '100 puzzles solved' },
  // Streak: 3, 7, 14, 30
  { key: '3-day-streak', category: 'streak', tier: 0, threshold: 3, description: '3 day streak' },
  { key: '7-day-streak', category: 'streak', tier: 1, threshold: 7, description: '7 day streak' },
  { key: '14-day-streak', category: 'streak', tier: 2, threshold: 14, description: '14 day streak' },
  { key: '30-day-streak', category: 'streak', tier: 3, threshold: 30, description: '30 day streak' },
  // Speed: under 5min, 2min, 1min, 30sec
  { key: 'speed-5min', category: 'speed', tier: 0, thresholdMs: 5 * 60 * 1000, description: 'Solved in under 5 minutes' },
  { key: 'speed-2min', category: 'speed', tier: 1, thresholdMs: 2 * 60 * 1000, description: 'Solved in under 2 minutes' },
  { key: 'speed-1min', category: 'speed', tier: 2, thresholdMs: 60 * 1000, description: 'Solved in under 1 minute' },
  { key: 'speed-30sec', category: 'speed', tier: 3, thresholdMs: 30 * 1000, description: 'Solved in under 30 seconds' },
  // Perfects: 10, 25, 50, 100
  { key: '10-perfects', category: 'perfects', tier: 0, threshold: 10, description: '10 perfect solves' },
  { key: '25-perfects', category: 'perfects', tier: 1, threshold: 25, description: '25 perfect solves' },
  { key: '50-perfects', category: 'perfects', tier: 2, threshold: 50, description: '50 perfect solves' },
  { key: '100-perfects', category: 'perfects', tier: 3, threshold: 100, description: '100 perfect solves' },
  // Hint types (each used at least once) - cycle through 4 colors
  { key: 'hint-word-starts', category: 'hints', tier: 0, description: 'Used word starts' },
  { key: 'hint-first3', category: 'hints', tier: 1, description: 'Used first letters lifeline' },
  { key: 'hint-last3', category: 'hints', tier: 2, description: 'Used last letters lifeline' },
  { key: 'hint-middle3', category: 'hints', tier: 3, description: 'Used middle letters lifeline' },
  { key: 'hint-first-last-step', category: 'hints', tier: 0, description: 'Used first/last/step lifeline' },
  { key: 'hint-reveal-letter', category: 'hints', tier: 1, description: 'Used reveal letter' },
  { key: 'hint-reveal-word', category: 'hints', tier: 2, description: 'Used reveal word' },
];

export const FIRST_SOLVE_BADGE = { key: 'first-solve', emoji: '🎉', description: 'First puzzle solved!' };

export function getAchievedBadges() {
  try {
    return new Set(JSON.parse(localStorage.getItem('stepwords-badges-achieved') || '[]'));
  } catch {
    return new Set();
  }
}

/** Compute which badges are achieved from current stats (for display - works for users who completed before badge system) */
export function getAchievedBadgesFromStats() {
  const achieved = new Set(getAchievedBadges());
  try {
    const mainCompleted = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
    const quickCompleted = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
    const totalCompleted = mainCompleted.length + quickCompleted.length;

    const mainStreak = JSON.parse(localStorage.getItem('stepwords-streak-main') || '{}');
    const quickStreak = JSON.parse(localStorage.getItem('stepwords-streak-quick') || '{}');
    const currentStreak = Math.max(mainStreak.current || 0, quickStreak.current || 0);

    const mainPerfect = JSON.parse(localStorage.getItem('stepwords-perfect') || '[]');
    const quickPerfect = JSON.parse(localStorage.getItem('quickstep-perfect') || '[]');
    const perfectCount = mainPerfect.length + quickPerfect.length;

    const mainTimes = JSON.parse(localStorage.getItem('stepwords-times') || '{}');
    const quickTimes = JSON.parse(localStorage.getItem('quickstep-times') || '{}');
    let fastestMs = Infinity;
    for (const v of [...Object.values(mainTimes || {}), ...Object.values(quickTimes || {})]) {
      const ms = v && typeof v === 'object' && Number.isFinite(v.elapsedMs) ? v.elapsedMs : (typeof v === 'number' ? v : null);
      if (Number.isFinite(ms) && ms > 0) fastestMs = Math.min(fastestMs, ms);
    }

    const hintsUsed = new Set(JSON.parse(localStorage.getItem('stepwords-hints-used') || '[]'));

    if (totalCompleted >= 1) achieved.add('first-solve');
    if (totalCompleted >= 10) achieved.add('10-solves');
    if (totalCompleted >= 25) achieved.add('25-solves');
    if (totalCompleted >= 50) achieved.add('50-solves');
    if (totalCompleted >= 100) achieved.add('100-solves');
    if (currentStreak >= 3) achieved.add('3-day-streak');
    if (currentStreak >= 7) achieved.add('7-day-streak');
    if (currentStreak >= 14) achieved.add('14-day-streak');
    if (currentStreak >= 30) achieved.add('30-day-streak');
    if (fastestMs < 5 * 60 * 1000) achieved.add('speed-5min');
    if (fastestMs < 2 * 60 * 1000) achieved.add('speed-2min');
    if (fastestMs < 60 * 1000) achieved.add('speed-1min');
    if (fastestMs < 30 * 1000) achieved.add('speed-30sec');
    if (perfectCount >= 10) achieved.add('10-perfects');
    if (perfectCount >= 25) achieved.add('25-perfects');
    if (perfectCount >= 50) achieved.add('50-perfects');
    if (perfectCount >= 100) achieved.add('100-perfects');
    if (hintsUsed.has('hint-word-starts')) achieved.add('hint-word-starts');
    if (hintsUsed.has('hint-first3')) achieved.add('hint-first3');
    if (hintsUsed.has('hint-last3')) achieved.add('hint-last3');
    if (hintsUsed.has('hint-middle3')) achieved.add('hint-middle3');
    if (hintsUsed.has('hint-first-last-step')) achieved.add('hint-first-last-step');
    if (hintsUsed.has('hint-reveal-letter')) achieved.add('hint-reveal-letter');
    if (hintsUsed.has('hint-reveal-word')) achieved.add('hint-reveal-word');

    return achieved;
  } catch {
    return achieved;
  }
}

export function getBadgeColor(badge, achieved) {
  if (!achieved) return GRAY;
  const def = ALL_BADGES.find((b) => b.key === badge);
  if (!def || def.tier == null) return 'text-yellow-400';
  return TIER_COLORS[Math.min(def.tier, TIER_COLORS.length - 1)];
}

export function getBadgeDisplayInfo(badgeKey, achieved) {
  if (badgeKey === 'first-solve') {
    return { emoji: FIRST_SOLVE_BADGE.emoji, description: FIRST_SOLVE_BADGE.description, color: achieved ? 'text-amber-500' : GRAY };
  }
  const def = ALL_BADGES.find((b) => b.key === badgeKey);
  if (!def) return { emoji: '🏅', description: badgeKey, color: GRAY };
  const cat = BADGE_CATEGORIES[def.category];
  return {
    emoji: cat?.emoji || '🏅',
    description: def.description,
    color: achieved ? TIER_COLORS[Math.min(def.tier ?? 0, TIER_COLORS.length - 1)] : GRAY,
  };
}
