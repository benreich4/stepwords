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
 * @returns {Object} Reveal state and functions
 */
export function useReveal(rows, guesses, setGuesses, lockColors, setLockColors, level, showToast, wordRevealed, setWordRevealed) {
  const [showWordRevealConfirm, setShowWordRevealConfirm] = useState(false);

  // Reveal word function
  const revealCurrentWord = () => {
    const currentWord = rows[level]?.answer || "";
    if (currentWord) {
      // Fill in the current word
      const newGuesses = [...guesses];
      newGuesses[level] = currentWord;
      setGuesses(newGuesses);
      
      // Update the lock colors to show the word as revealed (yellow like hints)
      const newLockColors = [...lockColors];
      const rowColors = new Array(currentWord.length).fill('Y'); // All yellow for revealed word
      newLockColors[level] = rowColors;
      setLockColors(newLockColors);
      
      // Mark as revealed (only set to true on first reveal)
      if (!wordRevealed) {
        setWordRevealed(true);
      }
      
      // Show success message
      showToast(`Word revealed: ${currentWord.toUpperCase()}`, 2000, "info");
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
  revealCurrentWord 
}) {
  if (!showWordRevealConfirm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-200">
        <div className="text-lg font-semibold mb-2">Reveal Word</div>
        <div className="text-sm mb-4">
          Revealing the current word will limit your maximum score to 0 stars.
        </div>
        <div className="flex justify-end gap-2 text-sm">
          <button
            className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
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
