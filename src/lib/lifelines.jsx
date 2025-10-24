import { useMemo } from 'react';

/**
 * Custom hook for lifeline functionality
 * @param {Array} rows - Array of puzzle rows with answers
 * @param {Array} lockColors - Array of row color states
 * @param {number} lifelineLevel - Current lifeline level (0-5)
 * @param {Function} setLifelineLevel - Function to update lifeline level
 * @param {Function} setHintCount - Function to update hint count
 * @param {Function} showToast - Function to show toast messages
 * @returns {Object} Lifeline state and functions
 */
export function useLifelines(rows, lockColors, lifelineLevel, setLifelineLevel, setHintCount, showToast, puzzle, isQuick) {
  // Generate prefix data for lifeline system
  const { generatePrefixData, maxLevel } = useMemo(() => {
    if (!rows || rows.length === 0) return { generatePrefixData: {}, maxLevel: 0 };

    const maxLen = rows.reduce((m, r) => Math.max(m, (r?.answer || '').length), 0);
    const prefixData = {};
    const solvedWords = new Set();

    // Track which words are solved (all letters are colored, not null/undefined)
    rows.forEach((row, index) => {
      const rowColors = lockColors[index];
      if (rowColors && rowColors.every(Boolean)) {
        solvedWords.add(row.answer.toLowerCase());
      }
    });

    // Generate tokens for each level up to max word length
    for (let level = 1; level <= maxLen; level++) {
      const tokenCounts = {};

      rows.forEach(row => {
        const word = (row.answer || '').toLowerCase();
        if (!word) return;
        const token = word.slice(0, Math.min(level, word.length)); // full word if shorter than level
        if (!tokenCounts[token]) {
          tokenCounts[token] = { total: 0, solved: 0 };
        }
        tokenCounts[token].total++;
        if (solvedWords.has(word)) tokenCounts[token].solved++;
      });

      // Convert to array and sort alphabetically
      const sorted = Object.entries(tokenCounts)
        .map(([prefix, counts]) => ({ prefix, ...counts }))
        .sort((a, b) => a.prefix.localeCompare(b.prefix));

      prefixData[level] = sorted;
    }

    return { generatePrefixData: prefixData, maxLevel: maxLen };
  }, [rows, lockColors]);

  const showPrefixes = () => {
    setLifelineLevel(1);
    setHintCount(n => n + 1);
    showToast("Revealed 1-letter word starts", 2000, "info");

    // Track initial hint usage (extending from 0 to 1)
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'hint_used', {
          hint_type: 'extend_word_starts',
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
        if (window.gtag && typeof window.gtag === 'function') {
          window.gtag('event', 'hint_used', {
            hint_type: 'extend_word_starts',
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
  canExtend 
}) {
  if (!showLifelineMenu) return null;

  return (
    <div data-lifeline-menu className="absolute right-0 top-full mt-1 min-w-[220px] rounded-lg border border-gray-700 bg-gray-900/95 backdrop-blur-sm p-3 text-sm shadow-xl ring-1 ring-white/10 menu-pop-in">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-100 mb-1">Word Starts</h3>
        {lifelineLevel === 0 ? (
          <div>
            <p className="text-gray-400 text-sm mb-1">Reveal one or more of the first letters of each answer.</p>
            <p className="text-gray-500 text-xs">Shown alphabetically</p>
          </div>
        ) : (
          <div>
            <div className="mb-1 text-gray-300 text-sm">
              Up to {lifelineLevel}-letter word starts:
            </div>
            <div className="space-y-1">
              {generatePrefixData[lifelineLevel]?.map(({ prefix, total, solved }) => (
                <div key={prefix} className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {prefix.split('').map((letter, i) => {
                      const isFullySolved = solved === total;
                      return (
                        <div 
                          key={i} 
                          className={`w-4 h-4 border flex items-center justify-center text-white text-sm font-semibold ${
                            isFullySolved 
                              ? 'bg-green-600 border-green-500' 
                              : 'bg-yellow-600 border-yellow-500'
                          }`}
                        >
                          {letter.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm ${solved === total ? 'text-green-400' : 'text-gray-400'}`}>
                      {solved}/{total} word{solved !== 1 && total !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-gray-500 text-xs">Shown alphabetically</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-1">
        {lifelineLevel === 0 ? (
          <button
            onClick={showPrefixes}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Show Word Starts
          </button>
        ) : (
          <button
            onClick={extendPrefixes}
            disabled={!canExtend}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {canExtend ? "Extend Word Starts" : "Fully Extended"}
          </button>
        )}
        <button
          onClick={() => setShowLifelineMenu(false)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Close
        </button>
      </div>
    </div>
  );
}
