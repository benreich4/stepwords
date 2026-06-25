import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchManifest, loadPuzzleById } from '../lib/puzzles.js';
import { fetchQuickManifest, loadQuickById } from '../lib/quickPuzzles.js';
import { useLightMode, utilityPageClass, utilityInputClass, utilityMutedClass } from '../hooks/useLightMode.js';

// Small badge showing how many times a word has appeared in published puzzles
function UsageBadge({ count, light = false }) {
  if (count == null) return null;
  return (
    <span
      className={`ml-2 shrink-0 text-xs px-1.5 py-0.5 rounded ${
        count > 0
          ? light ? 'bg-gold-400/20 text-gold-700' : 'bg-gold-400/20 text-gold-300'
          : light ? 'bg-parchment-200 text-navyink-700/45' : 'bg-navyink-700/60 text-parchment-200/40'
      }`}
      title={count > 0 ? `Used ${count} time${count === 1 ? '' : 's'} in past puzzles` : 'Not used in any puzzle yet'}
    >
      {count}×
    </span>
  );
}

const Explore = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [wordList, setWordList] = useState([]);
  const [wordDict, setWordDict] = useState({});
  const [path, setPath] = useState([]);
  const [subWords, setSubWords] = useState([]);
  const [addWords, setAddWords] = useState([]);
  const [anagrams, setAnagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minLength, setMinLength] = useState(10);
  const [suggesting, setSuggesting] = useState(false);
  const [chainMinLength, setChainMinLength] = useState(5);
  const [scoreCutoff, setScoreCutoff] = useState(30);
  const [reloading, setReloading] = useState(false);
  const [usage, setUsage] = useState(null); // Map: word (no spaces) -> times used in puzzles

  const navigate = useNavigate();
  const light = useLightMode();
  const page = utilityPageClass(light);
  const input = utilityInputClass(light);
  const muted = utilityMutedClass(light);
  const link = light ? 'text-brand-700 hover:text-brand-800 underline' : 'text-brand-300 hover:text-brand-200 underline';
  const btn = 'px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50';
  const listBtn = light
    ? 'w-full flex items-center justify-between px-3 py-2 rounded-xl border border-parchment-200 bg-parchment-50 hover:bg-parchment-100 transition-colors'
    : 'w-full flex items-center justify-between px-3 py-2 rounded-xl border border-navyink-600 bg-navyink-850 hover:bg-navyink-700 transition-colors';

  const usageCount = (word) => {
    if (!usage) return null;
    return usage.get((word || '').toLowerCase().replace(/\s+/g, '')) || 0;
  };

  // Tally how often each answer has been used across all main + quick puzzles
  useEffect(() => {
    let cancelled = false;
    const tally = (counts, puzzle) => {
      if (!puzzle || !Array.isArray(puzzle.rows)) return;
      puzzle.rows.forEach((row) => {
        const w = (row.answer || '').toLowerCase().trim().replace(/\s+/g, '');
        if (w) counts.set(w, (counts.get(w) || 0) + 1);
      });
    };
    (async () => {
      try {
        const [mainManifest, quickManifest] = await Promise.all([fetchManifest(), fetchQuickManifest()]);
        const counts = new Map();
        const batchSize = 12;
        for (let i = 0; i < mainManifest.length; i += batchSize) {
          if (cancelled) return;
          const res = await Promise.allSettled(mainManifest.slice(i, i + batchSize).map((m) => loadPuzzleById(m.id)));
          res.forEach((r) => { if (r.status === 'fulfilled') tally(counts, r.value); });
        }
        for (let i = 0; i < quickManifest.length; i += batchSize) {
          if (cancelled) return;
          const res = await Promise.allSettled(quickManifest.slice(i, i + batchSize).map((m) => loadQuickById(m.id)));
          res.forEach((r) => { if (r.status === 'fulfilled') tally(counts, r.value); });
        }
        if (!cancelled) setUsage(counts);
      } catch {
        // Usage info is optional; ignore failures
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load word list and build dictionary
  useEffect(() => {
    const loadWordList = async () => {
      try {
        const response = await fetch('/wordList.txt');
        const text = await response.text();
        const lines = text.split('\n');
        
        // Filter words with frequency >= 30 and build dictionary
        const words = lines
          .map(line => line.split(';'))
          .filter(parts => parts.length >= 2 && parseInt(parts[1]) >= 30)
          .map(parts => parts[0].toLowerCase().trim())
          .filter(word => word.length > 0);

        // Group by sorted letters
        const dict = {};
        words.forEach(word => {
          const sorted = word.split('').sort().join('');
          if (!dict[sorted]) {
            dict[sorted] = [];
          }
          if (!dict[sorted].includes(word)) {
            dict[sorted].push(word);
          }
        });

        setWordList(words);
        setWordDict(dict);
        setLoading(false);
      } catch (error) {
        console.error('Error loading word list:', error);
        setLoading(false);
      }
    };

    loadWordList();
  }, []);

  // Manual reload with selectable score cutoff
  const reloadWithCutoff = async (cutoff) => {
    try {
      setReloading(true);
      const response = await fetch('/wordList.txt');
      const text = await response.text();
      const lines = text.split('\n');

      const cutoffNum = Number.isFinite(cutoff) ? cutoff : 30;
      const words = lines
        .map(line => line.split(';'))
        .filter(parts => parts.length >= 2 && parseInt(parts[1]) >= cutoffNum)
        .map(parts => parts[0].toLowerCase().trim())
        .filter(word => word.length > 0);

      const dict = {};
      words.forEach(word => {
        const sorted = word.split('').sort().join('');
        if (!dict[sorted]) {
          dict[sorted] = [];
        }
        if (!dict[sorted].includes(word)) {
          dict[sorted].push(word);
        }
      });

      setWordList(words);
      setWordDict(dict);
    } catch (error) {
      console.error('Error reloading word list:', error);
    } finally {
      setReloading(false);
    }
  };

  // Helper functions for word operations
  const subOptions = (word) => {
    if (word.length === 1) return [];
    return Array.from(new Set(
      Array.from({ length: word.length }, (_, i) => 
        word.slice(0, i) + word.slice(i + 1)
      )
    ));
  };

  const addOptions = (word) => {
    return 'abcdefghijklmnopqrstuvwxyz'.split('').map(c => word + c);
  };

  const findSubWords = (word) => {
    const options = subOptions(word);
    const results = [];
    options.forEach(option => {
      const sorted = option.split('').sort().join('');
      if (wordDict[sorted]) {
        results.push(...wordDict[sorted]);
      }
    });
    return [...new Set(results)];
  };

  const findAddWords = (word) => {
    const options = addOptions(word);
    const results = [];
    options.forEach(option => {
      const sorted = option.split('').sort().join('');
      if (wordDict[sorted]) {
        results.push(...wordDict[sorted]);
      }
    });
    return [...new Set(results)];
  };

  // Find anagrams of the current word
  const findAnagrams = (word) => {
    const sorted = word.split('').sort().join('');
    return wordDict[sorted] || [];
  };

  // Update word options when current word changes
  useEffect(() => {
    if (currentWord && Object.keys(wordDict).length > 0) {
      setSubWords(findSubWords(currentWord));
      setAddWords(findAddWords(currentWord));
      setAnagrams(findAnagrams(currentWord));
    } else {
      setSubWords([]);
      setAddWords([]);
      setAnagrams([]);
    }
  }, [currentWord, wordDict]);

  const handleWordSelect = (word) => {
    // Only add currentWord to path if it's not already in the path
    // This prevents duplicates when navigating backwards
    const newPath = path.includes(currentWord) ? path : [...path, currentWord];
    setPath(newPath);
    setCurrentWord(word);
  };

  const handleBreadcrumbClick = (index) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    setCurrentWord(newPath[newPath.length - 1] || '');
  };

  const handleInputChange = (e) => {
    const newWord = e.target.value.toLowerCase();
    setCurrentWord(newWord);
    // Reset path when typing a new word
    if (newWord !== currentWord) {
      setPath([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      // Find the word in our dictionary
      const sorted = currentWord.split('').sort().join('');
      if (wordDict[sorted] && wordDict[sorted].includes(currentWord)) {
        setPath([]);
        // The currentWord is already set by handleInputChange
      }
    }
  };

  // Suggest good starting points based on Scala logic
  const suggestStartingPoint = () => {
    if (wordList.length === 0 || Object.keys(wordDict).length === 0) return;
    
    setSuggesting(true);
    
    // Filter words by exact length and shuffle
    const candidates = wordList
      .filter(word => word.length === minLength)
      .sort(() => Math.random() - 0.5); // Shuffle
    
    let bestWord = null;
    
    // Test up to 1000 random candidates to find good starting points
    const testCount = Math.min(1000, candidates.length);
    
    for (let i = 0; i < testCount; i++) {
      const word = candidates[i];
      const chainLength = findMaxChainLength(word);
      
      // Only accept words that can form chains of at least the requested length
      if (chainLength >= chainMinLength) {
        bestWord = word;
        break; // Use the first word we find meeting the requested chain length
      }
    }
    
    if (bestWord) {
      setCurrentWord(bestWord);
      setPath([]);
    } else {
      // If no word with chain >= requested found, show a message
      alert(`No words found with chains of length ${chainMinLength}+ for word length ${minLength}. Tested ${testCount} candidates. Try a different length.`);
    }
    
    setSuggesting(false);
  };

  // Find the maximum chain length for a given word (implementing Scala dIterator logic)
  const findMaxChainLength = (startWord) => {
    if (!startWord || startWord.length < 2) return 1;
    
    const queue = [[startWord]]; // Start with the word as a single-element path
    let maxLength = 1;
    const visited = new Set();
    let iterations = 0;
    
    while (queue.length > 0 && iterations < 1000) { // Prevent infinite loops
      iterations++;
      const currentPath = queue.shift();
      const currentWord = currentPath[currentPath.length - 1];
      const pathKey = currentPath.join('|');
      
      if (visited.has(pathKey)) continue;
      visited.add(pathKey);
      
      // Find all valid sub-words (words that can be formed by removing one letter)
      const subOpts = subOptions(currentWord);
      const validSubWords = [];
      
      for (const option of subOpts) {
        const sorted = option.split('').sort().join('');
        const words = wordDict[sorted] || [];
        
        for (const word of words) {
          // Avoid cycles - don't use words already in the current path
          if (!currentPath.includes(word)) {
            validSubWords.push(word);
          }
        }
      }
      
      // Add each valid sub-word as a new path
      for (const subWord of validSubWords) {
        const newPath = [...currentPath, subWord];
        queue.push(newPath);
        maxLength = Math.max(maxLength, newPath.length);
      }
      
      // Limit search depth to prevent excessive computation
      if (maxLength >= 15) break;
    }

    return maxLength;
  };

  if (loading) {
    return (
      <div className={`${page} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${light ? 'border-brand-600' : 'border-parchment-200'}`} />
          <p className={muted}>Loading word list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${page} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Explore Word Chains</h1>
          <p className={muted}>Find word chains for your Stepwords puzzles</p>
          <div className="mt-4">
            <a href="/create" className={link}>← Submit a Puzzle</a>
          </div>
          {/* Word list score cutoff + reload */}
          <div className="mt-3 flex items-end gap-1">
            <div>
              <label className={`block text-xs mb-1 ${muted}`}>Word list score cutoff</label>
              <select
                value={String(scoreCutoff)}
                onChange={(e) => setScoreCutoff(parseInt(e.target.value) || 0)}
                className={`w-24 h-10 px-2 rounded-xl border ${input}`}
              >
                <option value="0">0</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
            </div>
            <button
              onClick={() => reloadWithCutoff(scoreCutoff)}
              className={`ml-1 ${btn} h-10`}
              disabled={reloading}
            >
              {reloading ? 'Reloading…' : 'Reload'}
            </button>
            <div className={`pb-2 text-sm ${muted}`}>{wordList.length.toLocaleString()} words</div>
          </div>
        </div>

        {/* Word Input and Suggestions */}
        <div className="mb-8">
          <div className="max-w-2xl">
            <label className="block text-sm font-medium mb-2">Enter a word to explore:</label>
            {/* Controls row: Word Length, Chain Length, Suggest */}
            <div className="flex gap-3 items-end mb-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Word Length:</label>
                <input
                  type="number"
                  value={minLength}
                  onChange={(e) => setMinLength(parseInt(e.target.value) || 10)}
                  min="3"
                  max="20"
                  className={`w-20 px-2 py-2 rounded-xl border text-center ${input}`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Chain Length:</label>
                <input
                  type="number"
                  value={chainMinLength}
                  onChange={(e) => { const v = parseInt(e.target.value, 10); setChainMinLength(Number.isFinite(v) ? v : 5); }}
                  min="0"
                  max="20"
                  className={`w-20 px-2 py-2 rounded-xl border text-center ${input}`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">&nbsp;</label>
                <button
                  onClick={suggestStartingPoint}
                  disabled={suggesting || wordList.length === 0}
                  className={`${btn} h-10`}
                >
                  {suggesting ? 'Finding...' : '🎯 Suggest'}
                </button>
              </div>
            </div>
            {/* Word input row */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Word:</label>
              <input
                type="text"
                value={currentWord}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type a word..."
                className={`w-full px-4 py-2 rounded-xl border ${input}`}
              />
            </div>
            {currentWord && (
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-300">
                <span>Length: <span className="font-semibold">{currentWord.length}</span></span>
                {usageCount(currentWord) != null && (
                  <span>
                    Used previously:{' '}
                    <span className={`font-semibold ${usageCount(currentWord) > 0 ? 'text-amber-300' : 'text-gray-400'}`}>
                      {usageCount(currentWord)}×
                    </span>
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              The suggest button finds words that can form long chains for better puzzle creation
            </p>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {path.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-400">Path:</span>
              {path.map((word, index) => (
                <div key={index} className="flex items-center">
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {word}
                  </button>
                  {index < path.length - 1 && <span className="mx-2 text-gray-400">→</span>}
                </div>
              ))}
              {currentWord && (
                <>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-white font-medium">{currentWord}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Word Options */}
        {currentWord && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Previous Words (Sub Words) */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <span className="text-red-400 mr-2">↓</span>
                Previous Words ({Math.max(0, currentWord.length - 1)})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subWords.length > 0 ? (
                  subWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelect(word)}
                      className={`${listBtn} hover:border-red-400`}
                    >
                      <span className="text-left"><span className="text-red-400 mr-2">↓</span>{word}</span>
                      <UsageBadge count={usageCount(word)} light={light} />
                    </button>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No previous words found</p>
                )}
              </div>
            </div>

            {/* Current Word Anagrams */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <span className="text-yellow-400 mr-2">↔</span>
                Anagrams ({currentWord.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {anagrams.length > 0 ? (
                  anagrams.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelect(word)}
                      className={`${listBtn} hover:border-gold-400`}
                    >
                      <span className="text-left"><span className="text-yellow-400 mr-2">↔</span>{word}</span>
                      <UsageBadge count={usageCount(word)} light={light} />
                    </button>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No anagrams found</p>
                )}
              </div>
            </div>

            {/* Next Words (Add Words) */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <span className="text-blue-400 mr-2">↑</span>
                Next Words ({currentWord.length + 1})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {addWords.length > 0 ? (
                  addWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelect(word)}
                      className={`${listBtn} hover:border-brand-400`}
                    >
                      <span className="text-left"><span className="text-blue-400 mr-2">↑</span>{word}</span>
                      <UsageBadge count={usageCount(word)} light={light} />
                    </button>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No next words found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`mt-8 pt-6 border-t ${light ? 'border-parchment-200' : 'border-navyink-700'}`}>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className={btn}
            >
              ← Back to Game
            </button>
            {path.length > 0 && (
              <button
                onClick={() => {
                  // Create a puzzle from the current path
                  const puzzleWords = [...path, currentWord].filter(word => word.length > 0);
                  const puzzleClues = puzzleWords.map(() => ''); // Empty clues for user to fill
                  
                  // Store in localStorage for the submission page to pick up
                  localStorage.setItem('explorePuzzleWords', JSON.stringify(puzzleWords));
                  localStorage.setItem('explorePuzzleClues', JSON.stringify(puzzleClues));
                  
                  navigate('/create');
                }}
                className={btn}
              >
                📝 Create Puzzle from Path
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore