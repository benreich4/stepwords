import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const navigate = useNavigate();

  // Load word list and build dictionary
  useEffect(() => {
    const loadWordList = async () => {
      try {
        const response = await fetch('/XwiWordList.txt');
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
    
    // Filter words by minimum length and shuffle
    const candidates = wordList
      .filter(word => word.length >= minLength)
      .sort(() => Math.random() - 0.5); // Shuffle
    
    let bestWord = null;
    
    // Test up to 1000 random candidates to find good starting points
    const testCount = Math.min(1000, candidates.length);
    
    for (let i = 0; i < testCount; i++) {
      const word = candidates[i];
      const chainLength = findMaxChainLength(word);
      
      // Only accept words that can form chains of length 5 or more
      if (chainLength >= 5) {
        bestWord = word;
        // capture for potential UI in future; currently unused
        console.log(`Found good word: "${word}" with chain length ${chainLength}`);
        break; // Use the first word we find with chain >= 5
      }
    }
    
    if (bestWord) {
      setCurrentWord(bestWord);
      setPath([]);
    } else {
      // If no word with chain >= 5 found, show a message
      alert(`No words found with chains of length 5+ for minimum length ${minLength}. Tested ${testCount} candidates. Try lowering the minimum length.`);
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
    
    // Debug: log details for words with good chains
    if (maxLength >= 3) {
      console.log(`  "${startWord}" (${startWord.length} letters) -> max chain: ${maxLength}`);
    }
    
    return maxLength;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading word list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Word Chains</h1>
          <p className="text-gray-400">Find word chains for your Stepwords puzzles</p>
          <div className="mt-4">
            <a 
              href="/create" 
              className="text-blue-400 hover:text-blue-300 underline"
            >
              ← Submit a Puzzle
            </a>
          </div>
        </div>

        {/* Word Input and Suggestions */}
        <div className="mb-8">
          <div className="max-w-2xl">
            <label className="block text-sm font-medium mb-2">Enter a word to explore:</label>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Word:</label>
                <input
                  type="text"
                  value={currentWord}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a word..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min Length:</label>
                  <input
                    type="number"
                    value={minLength}
                    onChange={(e) => setMinLength(parseInt(e.target.value) || 10)}
                    min="3"
                    max="20"
                    className="w-16 px-2 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">&nbsp;</label>
                  <button
                    onClick={suggestStartingPoint}
                    disabled={suggesting || wordList.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium h-10"
                  >
                    {suggesting ? 'Finding...' : '🎯 Suggest'}
                  </button>
                </div>
              </div>
            </div>
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
                Previous Words ({subWords.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subWords.length > 0 ? (
                  subWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelect(word)}
                      className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-red-400 transition-colors"
                    >
                      <span className="text-red-400 mr-2">↓</span>
                      {word}
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
                Anagrams ({anagrams.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {anagrams.length > 0 ? (
                  anagrams.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelect(word)}
                      className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-yellow-400 transition-colors"
                    >
                      <span className="text-yellow-400 mr-2">↔</span>
                      {word}
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
                Next Words ({addWords.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {addWords.length > 0 ? (
                  addWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelect(word)}
                      className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-400 transition-colors"
                    >
                      <span className="text-blue-400 mr-2">↑</span>
                      {word}
                    </button>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No next words found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Back to Game */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            ← Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default Explore