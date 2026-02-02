/**
 * Milestone tracking and celebration utilities
 */

export function checkMilestones(puzzleId, isQuick, stats, puzzleNamespace) {
  const milestones = [];
  
  try {
    // Get completion counts (puzzle should already be marked as completed)
    const mainCompleted = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
    const quickCompleted = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
    const totalCompleted = mainCompleted.length + quickCompleted.length;
    
    // Get streak for the appropriate puzzle type
    const streakKey = isQuick ? 'stepwords-streak-quick' : 'stepwords-streak-main';
    const streakData = JSON.parse(localStorage.getItem(streakKey) || '{}');
    const currentStreak = streakData.current || 0;
    
    // Check milestone achievements
    const milestoneChecks = [
      { key: 'first-solve', condition: totalCompleted === 1, message: '🎉 First puzzle solved!', emoji: '🎉' },
      { key: '10-solves', condition: totalCompleted === 10, message: '🔥 10 puzzles solved!', emoji: '🔥' },
      { key: '25-solves', condition: totalCompleted === 25, message: '⭐ 25 puzzles solved!', emoji: '⭐' },
      { key: '50-solves', condition: totalCompleted === 50, message: '🏆 50 puzzles solved!', emoji: '🏆' },
      { key: '100-solves', condition: totalCompleted === 100, message: '💎 100 puzzles solved!', emoji: '💎' },
      { key: '3-day-streak', condition: currentStreak === 3, message: '🔥 3 day streak!', emoji: '🔥' },
      { key: '7-day-streak', condition: currentStreak === 7, message: '🌟 7 day streak!', emoji: '🌟' },
      { key: '14-day-streak', condition: currentStreak === 14, message: '💫 14 day streak!', emoji: '💫' },
      { key: '30-day-streak', condition: currentStreak === 30, message: '👑 30 day streak!', emoji: '👑' },
    ];
    
    // Check which milestones were just achieved
    const achievedKey = `stepwords-milestones-achieved`;
    const achieved = new Set(JSON.parse(localStorage.getItem(achievedKey) || '[]'));
    
    for (const milestone of milestoneChecks) {
      if (milestone.condition && !achieved.has(milestone.key)) {
        milestones.push(milestone);
        achieved.add(milestone.key);
      }
    }
    
    // Save achieved milestones
    if (milestones.length > 0) {
      localStorage.setItem(achievedKey, JSON.stringify(Array.from(achieved)));
    }
    
  } catch (error) {
    console.warn('Error checking milestones:', error);
  }
  
  return milestones;
}

export function checkPerfectSolve(hintCount, wrongGuessCount) {
  return hintCount === 0 && wrongGuessCount === 0;
}
