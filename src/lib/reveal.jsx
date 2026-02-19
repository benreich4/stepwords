import { useState } from 'react';
import { shouldSendAnalytics } from './autosolveUtils.js';
import { playCompletionSoundOnce } from './solveSound.js';
import { updateStreak } from './streak.js';
import { checkMilestones } from './milestones.js';

/**
 * Custom hook for reveal word functionality
 * @param {Function} onPuzzleComplete - Callback(stats) when puzzle is solved via reveal; receives stats for badge checking
 */
export function useReveal(rows, guesses, setGuesses, lockColors, setLockColors, level, showToast, wordRevealed, setWordRevealed, isPuzzleSolved, buildEmojiShareGridFrom, setShareText, setStars, setDidFail, setShowShare, hintCount, wrongGuessCount, scoreBase, puzzleNamespace, puzzle, isQuick, elapsedMs, elapsedDisplay, soundsEnabled = true, lifelinesUsed, lifelineLevel, letterRevealedUsed, onPuzzleComplete) {
  const [showWordRevealConfirm, setShowWordRevealConfirm] = useState(false);

  // Reveal word function
  const revealCurrentWord = () => {
    const currentWord = rows[level]?.answer || "";
    if (currentWord) {
      // Track reveal usage
      try {
        if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
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
        if (soundsEnabled) playCompletionSoundOnce(puzzle.id, puzzleNamespace, false, true);
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
        } catch {}
        
        // Save completion time
        try {
          const tkey = `${puzzleNamespace}-times`;
          const tmap = JSON.parse(localStorage.getItem(tkey) || '{}');
          tmap[puzzle.id] = elapsedMs;
          localStorage.setItem(tkey, JSON.stringify(tmap));
        } catch {}
        
        setShowShare(true);
        
        // Update streak (only if this is today's puzzle)
        const streakData = updateStreak(puzzle.date, isQuick);
        
        // Check badges and notify (only on puzzle complete)
        try {
          const stats = {
            hintCount,
            wrongGuessCount,
            elapsedMs,
            finalScore,
            lifelinesUsed: lifelinesUsed || {},
            lifelineLevel: lifelineLevel || 0,
            wordRevealed: true,
            letterRevealedUsed: letterRevealedUsed || false,
            isPerfect: false,
          };
          const milestones = checkMilestones(puzzle.id, isQuick, stats, puzzleNamespace);
          if (typeof onPuzzleComplete === 'function' && milestones.length > 0) {
            onPuzzleComplete(milestones);
          }
        } catch (e) {
          console.warn('Error checking badges on reveal complete:', e);
        }
        
        try {
          document.dispatchEvent(new CustomEvent('stepwords-puzzle-completed'));
        } catch {}
        
        // Track game completion
        try {
          if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
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
              streak_current: streakData?.current ?? 0,
              streak_longest: streakData?.longest ?? 0,
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
