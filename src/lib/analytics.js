// Analytics utility functions for Stepwords

// Check if gtag is available
const isGtagAvailable = () => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

// Track page views
export const trackPageView = (pageName) => {
  if (isGtagAvailable()) {
    window.gtag('config', 'G-K3HE6MH1XF', {
      page_title: pageName,
      page_location: window.location.href
    });
  }
};

// Track game events
export const trackGameEvent = (eventName, parameters = {}) => {
  if (isGtagAvailable()) {
    window.gtag('event', eventName, {
      event_category: 'game',
      ...parameters
    });
  }
};

// Track game completion
export const trackGameCompleted = (puzzleId, stats) => {
  trackGameEvent('game_completed', {
    puzzle_id: puzzleId,
    hints_used: stats.hintCount || 0,
    total_guesses: stats.guessCount || 0,
    wrong_guesses: stats.wrongGuessCount || 0,
    completion_time: stats.completionTime || 0,
    perfect_game: (stats.hintCount === 0 && stats.wrongGuessCount === 0)
  });
};

// Track hint usage
export const trackHintUsed = (hintType, puzzleId) => {
  trackGameEvent('hint_used', {
    hint_type: hintType,
    puzzle_id: puzzleId
  });
};

// Track puzzle start
export const trackPuzzleStarted = (puzzleId) => {
  trackGameEvent('puzzle_started', {
    puzzle_id: puzzleId
  });
};

// Track share action
export const trackShare = (puzzleId, stats) => {
  trackGameEvent('puzzle_shared', {
    puzzle_id: puzzleId,
    hints_used: stats.hintCount || 0,
    total_guesses: stats.guessCount || 0,
    perfect_game: (stats.hintCount === 0 && stats.wrongGuessCount === 0)
  });
};

// Track navigation
export const trackNavigation = (fromPage, toPage) => {
  trackGameEvent('navigation', {
    from_page: fromPage,
    to_page: toPage
  });
};

// Track creator usage
export const trackCreatorEvent = (eventName, parameters = {}) => {
  trackGameEvent(eventName, {
    event_category: 'creator',
    ...parameters
  });
};

// Track errors
export const trackError = (errorType, errorMessage) => {
  trackGameEvent('error', {
    event_category: 'error',
    error_type: errorType,
    error_message: errorMessage
  });
};
