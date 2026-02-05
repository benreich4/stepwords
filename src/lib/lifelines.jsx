import { useMemo, useState } from 'react';
import { shouldSendAnalytics } from './autosolveUtils.js';

/**
 * Custom hook for lifeline functionality
 * @param {Array} rows - Array of puzzle rows with answers
 * @param {Array} lockColors - Array of row color states
 * @param {Array} guesses - Array of current guesses for each row
 * @param {number} lifelineLevel - Current lifeline level (0-5)
 * @param {Function} setLifelineLevel - Function to update lifeline level
 * @param {Function} setHintCount - Function to update hint count
 * @param {Function} showToast - Function to show toast messages
 * @returns {Object} Lifeline state and functions
 */
export function useLifelines(rows, lockColors, guesses, lifelineLevel, setLifelineLevel, setHintCount, showToast, puzzle, isQuick) {
  // Generate prefix data for lifeline system
  const { generatePrefixData, maxLevel } = useMemo(() => {
    if (!rows || rows.length === 0) return { generatePrefixData: {}, maxLevel: 0 };

    const maxLen = rows.reduce((m, r) => Math.max(m, (r?.answer || '').length), 0);
    const prefixData = {};

    // Generate tokens for each level up to max word length
    for (let level = 1; level <= maxLen; level++) {
      const tokenCounts = {};

      rows.forEach((row, rowIndex) => {
        const word = (row.answer || '').toLowerCase();
        if (!word) return;
        const token = word.slice(0, Math.min(level, word.length)); // full word if shorter than level
        if (!tokenCounts[token]) {
          tokenCounts[token] = { total: 0, solved: 0 };
        }
        tokenCounts[token].total++;
        
        // Check if the first X letters (where X = level) are correct and checked
        const rowColors = lockColors[rowIndex];
        const guess = (guesses[rowIndex] || '').toUpperCase();
        const answer = word.toUpperCase();
        if (rowColors) {
          const prefixLength = Math.min(level, word.length);
          let allPrefixChecked = true;
          for (let i = 0; i < prefixLength; i++) {
            // A letter is "checked" if lockColors[i] is truthy (not null/undefined)
            // AND the guess matches the answer at that position
            // This means it's been revealed or correctly submitted
            if (!rowColors[i] || (guess[i] || '').toUpperCase() !== answer[i]) {
              allPrefixChecked = false;
              break;
            }
          }
          if (allPrefixChecked) {
            tokenCounts[token].solved++;
          }
        }
      });

      // Convert to array and sort alphabetically
      const sorted = Object.entries(tokenCounts)
        .map(([prefix, counts]) => ({ prefix, ...counts }))
        .sort((a, b) => a.prefix.localeCompare(b.prefix));

      prefixData[level] = sorted;
    }

    return { generatePrefixData: prefixData, maxLevel: maxLen };
  }, [rows, lockColors, guesses]);

  const showPrefixes = () => {
    setLifelineLevel(1);
    setHintCount(n => n + 1);
    showToast("Revealed 1-letter word starts", 2000, "info");

    // Track initial hint usage (extending from 0 to 1)
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'word_extension_used', {
          extension_type: 'initial',
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main',
          hint_level: 1
        });
      }
    } catch {}
  };

  const extendPrefixes = () => {
    if (lifelineLevel < maxLevel) {
      const nextLevel = lifelineLevel + 1;
      setLifelineLevel(nextLevel);
      setHintCount(n => n + 1);
      showToast(`Revealed ${nextLevel}-letter word starts`, 2000, "info");

      // Track extend hint usage
      try {
        if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'word_extension_used', {
          extension_type: 'extend',
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main',
            hint_level: nextLevel
          });
        }
      } catch {}
    }
  };

  return {
    generatePrefixData,
    showPrefixes,
    extendPrefixes,
    canExtend: lifelineLevel < maxLevel
  };
}

/**
 * Component for rendering the lifeline menu
 */
export function LifelineMenu({ 
  showLifelineMenu, 
  setShowLifelineMenu, 
  lifelineLevel, 
  generatePrefixData, 
  showPrefixes, 
  extendPrefixes, 
  canExtend,
  lifelinesUsed,
  isQuick,
  lightMode = false,
  onRevealFirst3,
  onRevealLast3,
  onRevealMiddle3,
  onRevealFirstLastStep,
  onGiveUpReveal
}) {
  if (!showLifelineMenu) return null;

  const [view, setView] = useState('root'); // 'root' | 'starts' | 'lifelines' | 'reveal'

  const goRoot = () => setView('root');

  return (
    <div data-lifeline-menu className={`absolute right-0 top-full mt-1 min-w-[220px] rounded-lg border backdrop-blur-sm p-3 text-sm shadow-xl menu-pop-in ${lightMode ? 'border-gray-300 bg-white ring-1 ring-black/5 text-gray-800' : 'border-gray-700 bg-gray-900/95 ring-1 ring-white/10 text-gray-300'}`}>
      {view === 'root' && (
        <div className="space-y-2 menu-pop-in">
          <button onClick={() => setView('starts')} className={`w-full text-left px-3 py-2 rounded-md border ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}>Word starts</button>
          <button onClick={() => setView('lifelines')} className={`w-full text-left px-3 py-2 rounded-md border ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}>Lifelines</button>
          <button onClick={() => setView('reveal')} className={`w-full text-left px-3 py-2 rounded-md border ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}>Reveal</button>
          <div className="flex justify-end">
            <button onClick={() => setShowLifelineMenu(false)} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Close</button>
          </div>
        </div>
      )}

      {view === 'starts' && (
        <div className="menu-pop-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${lightMode ? 'text-gray-900' : 'text-gray-100'}`}>Word Starts</h3>
            <button onClick={goRoot} className={`text-xs ${lightMode ? 'text-sky-600' : 'text-sky-400'} hover:underline`}>← Back</button>
          </div>
          {lifelineLevel === 0 ? (
            <div className="mb-2">
              <p className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-sm mb-1`}>Reveal the starting letters for all the answers, shown alphabetically.</p>
            </div>
          ) : (
            <div className="mb-2">
              <div className={`mb-1 text-sm ${lightMode ? 'text-gray-800' : 'text-gray-300'}`}>Up to {lifelineLevel}-letter word starts:</div>
              <div className={`mb-2 text-xs ${lightMode ? 'text-gray-500' : 'text-gray-500'}`}>Shown alphabetically.</div>
              <div className="space-y-1">
                {generatePrefixData[lifelineLevel]?.map(({ prefix, total, solved }) => (
                  <div key={prefix} className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {prefix.split('').map((letter, i) => {
                        const isFullySolved = solved === total;
                        return (
                          <div
                            key={i}
                            className={`w-4 h-4 border flex items-center justify-center text-sm font-semibold ${
                              isFullySolved
                                ? 'bg-green-600 border-green-500 text-white'
                                : 'bg-yellow-400 border-yellow-400 text-black'
                            }`}
                          >
                            {letter.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                    <span className={`text-sm ${solved === total ? (lightMode ? 'text-green-600' : 'text-green-400') : (lightMode ? 'text-gray-600' : 'text-gray-400')}`}>{solved}/{total} word{solved !== 1 && total !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className={`mt-2 pt-2 border-t text-xs mb-2 ${lightMode ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-500'}`}>Each extension counts as 1 misstep.</div>
          <div className="flex justify-end gap-2">
            {lifelineLevel === 0 ? (
              <button onClick={showPrefixes} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm min-h-[36px] flex items-center">Show</button>
            ) : (
              <button onClick={extendPrefixes} disabled={!canExtend} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm min-h-[36px] flex items-center">{canExtend ? 'Extend' : 'Fully Extended'}</button>
            )}
            <button onClick={goRoot} className={`px-3 py-2 border rounded-md text-sm min-h-[36px] flex items-center ${lightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-gray-700 hover:bg-gray-800'}`}>Back</button>
          </div>
        </div>
      )}

      {view === 'lifelines' && (
        <div className="menu-pop-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${lightMode ? 'text-gray-900' : 'text-gray-100'}`}>Lifelines</h3>
            <button onClick={goRoot} className={`text-xs ${lightMode ? 'text-sky-600' : 'text-sky-400'} hover:underline`}>← Back</button>
          </div>
          <div className={`text-xs mb-1 ${lightMode ? 'text-gray-600' : 'text-gray-500'}`}>Each lifeline can only be used once per puzzle.</div>
          <div className={`text-sm font-medium mb-2 ${lightMode ? 'text-gray-800' : 'text-gray-300'}`}>Reveal:</div>
          <div className="grid grid-cols-1 gap-1 mb-2">
            <button 
              onClick={onRevealFirst3} 
              disabled={lifelinesUsed?.first3}
              className={`px-3 py-2 min-h-[40px] text-left rounded-md border flex items-center ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800 disabled:bg-gray-800/30 disabled:text-gray-500'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              First {isQuick ? '2' : '3'} letters {lifelinesUsed?.first3 && "(Used)"}
            </button>
            <button 
              onClick={onRevealLast3} 
              disabled={lifelinesUsed?.last3}
              className={`px-3 py-2 min-h-[40px] text-left rounded-md border flex items-center ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800 disabled:bg-gray-800/30 disabled:text-gray-500'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Last {isQuick ? '2' : '3'} letters {lifelinesUsed?.last3 && "(Used)"}
            </button>
            <button 
              onClick={onRevealMiddle3} 
              disabled={lifelinesUsed?.middle3}
              className={`px-3 py-2 min-h-[40px] text-left rounded-md border flex items-center ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800 disabled:bg-gray-800/30 disabled:text-gray-500'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Middle {isQuick ? '2' : '3'} letters {lifelinesUsed?.middle3 && "(Used)"}
            </button>
            <button 
              onClick={onRevealFirstLastStep} 
              disabled={lifelinesUsed?.firstLastStep}
              className={`px-3 py-2 min-h-[40px] text-left rounded-md border flex items-center ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800 disabled:bg-gray-800/30 disabled:text-gray-500'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isQuick ? 'First/last letters' : 'First/last/step letters'} {lifelinesUsed?.firstLastStep && "(Used)"}
            </button>
          </div>
          <div className={`mt-2 pt-2 border-t text-xs mb-2 ${lightMode ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-500'}`}>Each lifeline counts as 2 missteps.</div>
          <div className="flex justify-end">
            <button onClick={goRoot} className={`px-3 py-1.5 border rounded-md text-sm ${lightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-gray-700 hover:bg-gray-800'}`}>Back</button>
          </div>
        </div>
      )}

      {view === 'reveal' && (
        <div className="menu-pop-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${lightMode ? 'text-gray-900' : 'text-gray-100'}`}>Reveal</h3>
            <button onClick={goRoot} className={`text-xs ${lightMode ? 'text-sky-600' : 'text-sky-400'} hover:underline`}>← Back</button>
          </div>
          <div className="grid grid-cols-1 gap-1 mb-2">
            <button onClick={() => { onGiveUpReveal && onGiveUpReveal('letter'); }} className={`px-3 py-1.5 text-left rounded-md border ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}>Reveal letter</button>
            <button onClick={() => { onGiveUpReveal && onGiveUpReveal('word'); }} className={`px-3 py-1.5 text-left rounded-md border ${lightMode ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}>Reveal word</button>
          </div>
          <div className={`mt-2 pt-2 border-t text-xs mb-2 ${lightMode ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-500'}`}>Revealing a letter counts as 2 missteps. Revealing a word limits your maximum to 0 stars.</div>
          <div className="flex justify-end">
            <button onClick={goRoot} className={`px-3 py-1.5 border rounded-md text-sm ${lightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-gray-700 hover:bg-gray-800'}`}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
