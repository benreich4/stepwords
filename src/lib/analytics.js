// Simple analytics for Stepwords

const track = (eventName, parameters = {}) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

export const trackPageView = (pageName) => {
  track('page_view', { page_name: pageName });
};

export const trackGameCompleted = (puzzleId, stats) => {
  track('game_completed', {
    puzzle_id: puzzleId,
    hints_used: stats.hintCount || 0,
    total_guesses: stats.guessCount || 0,
    wrong_guesses: stats.wrongGuessCount || 0
  });
};

export const trackHintUsed = (hintType, puzzleId) => {
  track('hint_used', { hint_type: hintType, puzzle_id: puzzleId });
};

export const trackPuzzleStarted = (puzzleId) => {
  track('puzzle_started', { puzzle_id: puzzleId });
};

export const trackShare = (puzzleId, stats) => {
  track('puzzle_shared', {
    puzzle_id: puzzleId,
    hints_used: stats.hintCount || 0,
    total_guesses: stats.guessCount || 0
  });
};