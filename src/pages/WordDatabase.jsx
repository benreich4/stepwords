import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchManifest, loadPuzzleById } from '../lib/puzzles.js';
import { fetchQuickManifest, loadQuickById } from '../lib/quickPuzzles.js';

export default function WordDatabase() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wordData, setWordData] = useState(null); // Map of word -> { frequency, clues: [{ clue, puzzleId, puzzleType, date }] }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [lightMode, setLightMode] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}');
      return s.lightMode === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.title = 'Stepwords - Word Database';
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const loadAllPuzzles = async () => {
      try {
        const [mainManifest, quickManifest] = await Promise.all([
          fetchManifest(),
          fetchQuickManifest(),
        ]);

        const wordMap = new Map(); // word -> { frequency, clues: [] }

        // Load all main puzzles in parallel batches
        const batchSize = 10;
        for (let i = 0; i < mainManifest.length; i += batchSize) {
          if (cancelled) return;
          const batch = mainManifest.slice(i, i + batchSize);
          const puzzles = await Promise.allSettled(
            batch.map((meta) => loadPuzzleById(meta.id))
          );

          puzzles.forEach((result, batchIndex) => {
            if (result.status === 'rejected') {
              console.warn(`Failed to load puzzle ${batch[batchIndex].id}:`, result.reason);
              return;
            }

            const puzzle = result.value;
            const meta = batch[batchIndex];
            if (!puzzle || !Array.isArray(puzzle.rows)) return;

            puzzle.rows.forEach((row, index) => {
              const word = (row.answer || '').toLowerCase().trim().replace(/\s+/g, '');
              if (!word) return;

              const clue = row.clue || '';
              if (!wordMap.has(word)) {
                wordMap.set(word, {
                  frequency: 0,
                  clues: [],
                });
              }

              const entry = wordMap.get(word);
              entry.frequency += 1;
              entry.clues.push({
                clue,
                puzzleId: meta.id,
                puzzleType: 'main',
                date: meta.date || '',
                rowIndex: index,
              });
            });
          });
        }

        // Load all quick puzzles in parallel batches
        for (let i = 0; i < quickManifest.length; i += batchSize) {
          if (cancelled) return;
          const batch = quickManifest.slice(i, i + batchSize);
          const puzzles = await Promise.allSettled(
            batch.map((meta) => loadQuickById(meta.id))
          );

          puzzles.forEach((result, batchIndex) => {
            if (result.status === 'rejected') {
              console.warn(`Failed to load quick puzzle ${batch[batchIndex].id}:`, result.reason);
              return;
            }

            const puzzle = result.value;
            const meta = batch[batchIndex];
            if (!puzzle || !Array.isArray(puzzle.rows)) return;

            puzzle.rows.forEach((row, index) => {
              const word = (row.answer || '').toLowerCase().trim().replace(/\s+/g, '');
              if (!word) return;

              const clue = row.clue || '';
              if (!wordMap.has(word)) {
                wordMap.set(word, {
                  frequency: 0,
                  clues: [],
                });
              }

              const entry = wordMap.get(word);
              entry.frequency += 1;
              entry.clues.push({
                clue,
                puzzleId: meta.id,
                puzzleType: 'quick',
                date: meta.date || '',
                rowIndex: index,
              });
            });
          });
        }

        if (!cancelled) {
          setWordData(wordMap);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load puzzles');
          setLoading(false);
        }
      }
    };

    loadAllPuzzles();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredWords = useMemo(() => {
    if (!wordData) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return Array.from(wordData.entries())
        .sort((a, b) => b[1].frequency - a[1].frequency || a[0].localeCompare(b[0]));
    }

    return Array.from(wordData.entries())
      .filter(([word]) => word.includes(query))
      .sort((a, b) => b[1].frequency - a[1].frequency || a[0].localeCompare(b[0]));
  }, [wordData, searchQuery]);

  const handleWordClick = (word) => {
    setSelectedWord(selectedWord === word ? null : word);
  };

  const selectedWordData = selectedWord && wordData ? wordData.get(selectedWord) : null;

  if (loading) {
    return (
      <div className={`min-h-screen p-4 ${lightMode ? 'bg-white text-gray-900' : 'bg-black text-gray-100'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-400">Loading word database...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-4 ${lightMode ? 'bg-white text-gray-900' : 'bg-black text-gray-100'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-400">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 ${lightMode ? 'bg-white text-gray-900' : 'bg-black text-gray-100'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Word Database</h1>
          <p className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
            All words used in main and quick puzzles
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a word..."
            className={`w-full px-4 py-2 rounded-lg border ${
              lightMode
                ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                : 'bg-gray-900 border-gray-700 text-gray-100 focus:border-blue-500'
            } focus:outline-none`}
          />
        </div>

        {/* Stats */}
        {wordData && (
          <div className={`mb-4 text-sm ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {filteredWords.length} {filteredWords.length === 1 ? 'word' : 'words'} found
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}

        {/* Word Details - appears at top when word is selected */}
        {selectedWord && selectedWordData && (
          <div
            className={`mb-6 p-6 rounded-lg border relative ${
              lightMode
                ? 'bg-gray-50 border-gray-300'
                : 'bg-gray-900 border-gray-700'
            }`}
          >
            <button
              onClick={() => setSelectedWord(null)}
              className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded ${
                lightMode
                  ? 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
              title="Close details"
            >
              ✕
            </button>
            <div className="mb-4 pr-8">
              <h2 className="text-2xl font-bold uppercase">{selectedWord}</h2>
            </div>

            <div className={`mb-4 text-sm ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Used {selectedWordData.frequency} {selectedWordData.frequency === 1 ? 'time' : 'times'} in{' '}
              {new Set(selectedWordData.clues.map((c) => `${c.puzzleType}-${c.puzzleId}`)).size}{' '}
              {new Set(selectedWordData.clues.map((c) => `${c.puzzleType}-${c.puzzleId}`)).size === 1
                ? 'puzzle'
                : 'puzzles'}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Clues:</h3>
              {selectedWordData.clues.map((clueData, index) => (
                <div
                  key={`${clueData.puzzleType}-${clueData.puzzleId}-${clueData.rowIndex}-${index}`}
                  className={`p-3 rounded border ${
                    lightMode ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm mb-1">{clueData.clue}</div>
                      <div className={`text-xs ${lightMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Row {clueData.rowIndex + 1} •{' '}
                        {clueData.puzzleType === 'main' ? 'Main' : 'Quick'} Puzzle #{clueData.puzzleId}
                        {clueData.date && ` • ${clueData.date}`}
                      </div>
                    </div>
                    <Link
                      to={clueData.puzzleType === 'main' ? `/${clueData.puzzleId}` : `/quick/${clueData.puzzleId}`}
                      className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                        lightMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      View Puzzle
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Word List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
          {filteredWords.map(([word, data]) => (
            <button
              key={word}
              onClick={() => handleWordClick(word)}
              className={`text-left px-3 py-2 rounded border transition-colors ${
                selectedWord === word
                  ? lightMode
                    ? 'bg-blue-100 border-blue-400 text-blue-900'
                    : 'bg-blue-900 border-blue-600 text-blue-100'
                  : lightMode
                  ? 'bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100'
                  : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium uppercase">{word}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    lightMode ? 'bg-gray-200 text-gray-700' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {data.frequency}x
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

