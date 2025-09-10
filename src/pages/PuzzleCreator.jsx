import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PuzzleCreator = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [wordList, setWordList] = useState([]);
  const [wordDict, setWordDict] = useState({});
  const [path, setPath] = useState([]);
  const [subWords, setSubWords] = useState([]);
  const [addWords, setAddWords] = useState([]);
  const [anagrams, setAnagrams] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Word finding functions (converted from Scala)
  const subOptions = (word) => {
    if (word.length === 1) return [];
    return Array.from({ length: word.length }, (_, i) => 
      word.slice(0, i) + word.slice(i + 1)
    ).filter((value, index, self) => self.indexOf(value) === index);
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
    setPath([...path, currentWord]);
    setCurrentWord(word);
  };

  const handleBreadcrumbClick = (index) => {
    const newPath = path.slice(0, index);
    setPath(newPath);
    setCurrentWord(newPath[newPath.length - 1] || '');
  };

  const handleInputChange = (e) => {
    setCurrentWord(e.target.value.toLowerCase());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      // Find the word in our dictionary
      const sorted = currentWord.split('').sort().join('');
      if (wordDict[sorted] && wordDict[sorted].includes(currentWord)) {
        setPath([]);
      }
    }
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
          <h1 className="text-3xl font-bold mb-2">Puzzle Creator</h1>
          <p className="text-gray-400">Find word chains for your Stepwords puzzles</p>
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
                  {index < path.length - 1 && (
                    <span className="mx-2 text-gray-400">→</span>
                  )}
                </div>
              ))}
              <span className="mx-2 text-gray-400">→</span>
              <span className="text-white font-semibold">{currentWord}</span>
            </div>
          </div>
        )}

        {/* Word Input */}
        <div className="mb-8">
          <label htmlFor="word-input" className="block text-sm font-medium mb-2">
            Enter a word to find related words:
          </label>
          <input
            id="word-input"
            type="text"
            value={currentWord}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a word..."
            className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Current Word Display */}
        {currentWord && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Word: {currentWord}</h2>
            
            {/* Word Options */}
            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
              {/* Previous Words (Sub Words) */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <span className="text-green-400 mr-2">↓</span>
                  Previous Words ({subWords.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {subWords.length > 0 ? (
                    subWords.map((word, index) => (
                      <button
                        key={index}
                        onClick={() => handleWordSelect(word)}
                        className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-green-400 transition-colors"
                      >
                        <span className="text-green-400 mr-2">↓</span>
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
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          word === currentWord 
                            ? 'bg-yellow-600 border-yellow-500 text-white' 
                            : 'bg-gray-800 hover:bg-gray-700 border-gray-600 hover:border-yellow-400'
                        }`}
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

export default PuzzleCreator;
