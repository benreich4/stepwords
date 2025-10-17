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
export function useLifelines(rows, lockColors, lifelineLevel, setLifelineLevel, setHintCount, showToast) {
  // Generate prefix data for lifeline system
  const generatePrefixData = useMemo(() => {
    if (!rows || rows.length === 0) return {};
    
    const prefixData = {};
    const solvedWords = new Set();
    
    // Track which words are solved (all letters are green)
    rows.forEach((row, index) => {
      const rowColors = lockColors[index];
      if (rowColors && rowColors.every(color => color === 'G')) {
        solvedWords.add(row.answer.toLowerCase());
      }
    });
    
    // Generate prefixes for each level
    for (let level = 1; level <= 5; level++) {
      const prefixCounts = {};
      
      rows.forEach(row => {
        const word = row.answer.toLowerCase();
        if (word.length >= level) {
          const prefix = word.substring(0, level);
          if (!prefixCounts[prefix]) {
            prefixCounts[prefix] = { total: 0, solved: 0 };
          }
          prefixCounts[prefix].total++;
          
          // Check if this word is solved
          if (solvedWords.has(word)) {
            prefixCounts[prefix].solved++;
          }
        }
      });
      
      // Convert to array and sort alphabetically
      const sortedPrefixes = Object.entries(prefixCounts)
        .map(([prefix, counts]) => ({ prefix, ...counts }))
        .sort((a, b) => a.prefix.localeCompare(b.prefix));
      
      prefixData[level] = sortedPrefixes;
    }
    
    return prefixData;
  }, [rows, lockColors]);

  const showPrefixes = () => {
    setLifelineLevel(1);
    setHintCount(n => n + 1);
    showToast("Revealed 1-letter prefixes", 2000, "info");
  };

  const extendPrefixes = () => {
    if (lifelineLevel < 5) {
      setLifelineLevel(lifelineLevel + 1);
      setHintCount(n => n + 1);
      showToast(`Revealed ${lifelineLevel + 1}-letter prefixes`, 2000, "info");
    }
  };

  return {
    generatePrefixData,
    showPrefixes,
    extendPrefixes,
    canExtend: lifelineLevel < 5
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
    <div data-lifeline-menu className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 text-xs min-w-fit">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-gray-100 mb-1">Word Prefixes</h3>
        {lifelineLevel === 0 ? (
          <p className="text-gray-400 text-xs">Click "Show Prefixes" to reveal word prefixes</p>
        ) : (
          <div>
            <div className="mb-1 text-gray-300 text-xs">
              {lifelineLevel}-letter prefixes:
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
                          className={`w-3.5 h-3.5 border flex items-center justify-center text-white text-xs font-semibold ${
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
                    <span className={`text-xs ${solved === total ? 'text-green-400' : 'text-gray-400'}`}>
                      {solved}/{total} word{solved !== 1 && total !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-1">
        {lifelineLevel === 0 ? (
          <button
            onClick={showPrefixes}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs whitespace-nowrap"
          >
            Show Prefixes
          </button>
        ) : (
          <button
            onClick={extendPrefixes}
            disabled={!canExtend}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-xs whitespace-nowrap"
          >
            Extend Prefixes
          </button>
        )}
        <button
          onClick={() => setShowLifelineMenu(false)}
          className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs whitespace-nowrap"
        >
          Close
        </button>
      </div>
    </div>
  );
}
