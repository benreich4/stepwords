import { useState } from 'react';

/**
 * Custom hook for reveal word functionality
 * @param {Array} rows - Array of puzzle rows with answers
 * @param {Array} guesses - Array of current guesses
 * @param {Function} setGuesses - Function to update guesses
 * @param {Array} lockColors - Array of row color states
 * @param {Function} setLockColors - Function to update lock colors
 * @param {number} level - Current word level
 * @param {Function} showToast - Function to show toast messages
 * @param {boolean} wordRevealed - Whether a word has been revealed
 * @param {Function} setWordRevealed - Function to update wordRevealed state
 * @param {Function} isPuzzleSolved - Function to check if puzzle is solved
 * @param {Function} buildEmojiShareGridFrom - Function to build share text
 * @param {Function} setShareText - Function to set share text
 * @param {Function} setStars - Function to set stars
 * @param {Function} setDidFail - Function to set failure state
 * @param {Function} setShowShare - Function to show share modal
 * @param {number} hintCount - Number of hints used
 * @param {number} wrongGuessCount - Number of wrong guesses
 * @param {number} scoreBase - Base score (usually 10)
 * @param {string} puzzleNamespace - Namespace for localStorage
 * @param {Object} puzzle - Puzzle object with id
 * @param {boolean} isQuick - Whether this is a quick puzzle
 * @param {number} elapsedMs - Elapsed timer milliseconds
 * @param {string} elapsedDisplay - Formatted elapsed time
 * @returns {Object} Reveal state and functions
 */
export function useReveal(rows, guesses, setGuesses, lockColors, setLockColors, level, showToast, wordRevealed, setWordRevealed, isPuzzleSolved, buildEmojiShareGridFrom, setShareText, setStars, setDidFail, setShowShare, hintCount, wrongGuessCount, scoreBase, puzzleNamespace, puzzle, isQuick, elapsedMs, elapsedDisplay) {
  const [showWordRevealConfirm, setShowWordRevealConfirm] = useState(false);

  // Reveal word function
  const revealCurrentWord = () => {
    const currentWord = rows[level]?.answer || "";
    if (currentWord) {
      // Track reveal usage
      try {
        if (window.gtag && typeof window.gtag === 'function') {
          window.gtag('event', 'reveal_used', {
            reveal_type: 'word',
            puzzle_id: puzzle.id || 'unknown',
            mode: isQuick ? 'quick' : 'main',
            word_level: level + 1,
            total_words: rows.length
          });
        }
      } catch {}
      // Fill in the current word
      const newGuesses = [...guesses];
      newGuesses[level] = currentWord;
      setGuesses(newGuesses);
      
      // Update the lock colors to show the word as revealed (yellow like hints)
      const newLockColors = [...lockColors];
      const rowColors = new Array(currentWord.length).fill('Y'); // All yellow for revealed word
      newLockColors[level] = rowColors;
      
      // Mark as revealed (only set to true on first reveal)
      if (!wordRevealed) {
        setWordRevealed(true);
      }
      
      // Check if puzzle is now solved
      if (isPuzzleSolved(newLockColors, rows)) {
        setLockColors(newLockColors);
        
        showToast("🎉 You solved all the Stepwords!", 2800, "success");
        const share = buildEmojiShareGridFrom(rows, newLockColors);
        setShareText(share);
        
        // Compute and persist stars from final score (capped at 0 due to reveal)
        const finalScore = Math.max(0, scoreBase - (hintCount + wrongGuessCount));
        const awarded = 0; // Always 0 stars when using reveal
        setStars(awarded);
        setDidFail(false);
        
        try {
          const key = `${puzzleNamespace}-stars`;
          const map = JSON.parse(localStorage.getItem(key) || '{}');
          map[puzzle.id] = awarded;
          localStorage.setItem(key, JSON.stringify(map));
        } catch {}
        
        // Mark puzzle as completed
        try {
          const completedPuzzles = JSON.parse(localStorage.getItem(`${puzzleNamespace}-completed`) || '[]');
          if (!completedPuzzles.includes(puzzle.id)) {
            completedPuzzles.push(puzzle.id);
            localStorage.setItem(`${puzzleNamespace}-completed`, JSON.stringify(completedPuzzles));
          }
          // Dispatch event to notify App.jsx of completion
          try {
            document.dispatchEvent(new CustomEvent('stepwords-puzzle-completed'));
          } catch {}
        } catch {}
        
        setShowShare(true);
        
        // Track game completion
        try {
          if (window.gtag && typeof window.gtag === 'function') {
            window.gtag('event', 'game_completed', {
              puzzle_id: puzzle.id || 'unknown',
              hints_used: hintCount,
              wrong_guesses: wrongGuessCount,
              final_score: finalScore,
              stars: awarded,
              mode: isQuick ? 'quick' : 'main',
              revealed: true,
              solve_time_ms: elapsedMs,
              solve_time_display: elapsedDisplay,
            });
          }
        } catch {}
      } else {
        // Just update the colors if puzzle isn't solved yet
        setLockColors(newLockColors);
        showToast(`Word revealed: ${currentWord.toUpperCase()}`, 2000, "info");
      }
    }
  };

  return {
    showWordRevealConfirm,
    setShowWordRevealConfirm,
    revealCurrentWord
  };
}

/**
 * Component for rendering the reveal confirmation modal
 */
export function RevealConfirmModal({ 
  showWordRevealConfirm, 
  setShowWordRevealConfirm, 
  revealCurrentWord,
  lightMode = false,
}) {
  if (!showWordRevealConfirm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className={`w-full max-w-sm rounded-lg border p-4 ${lightMode ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-700 bg-gray-900 text-gray-200'}`}>
        <div className="text-lg font-semibold mb-2">Reveal Word</div>
        <div className={`text-sm mb-4 ${lightMode ? 'text-gray-700' : ''}`}>
          Revealing the current word will limit your maximum score to 0 stars.
        </div>
        <div className="flex justify-end gap-2 text-sm">
          <button
            className={`px-3 py-1.5 rounded-md border ${lightMode ? 'border-gray-300 text-gray-800 hover:bg-gray-100' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
            onClick={() => setShowWordRevealConfirm(false)}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              revealCurrentWord();
              setShowWordRevealConfirm(false);
            }}
          >
            Reveal Word
          </button>
        </div>
      </div>
    </div>
  );
}
