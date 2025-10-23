import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PuzzleCreatorSimple = () => {
  const [submissionWords, setSubmissionWords] = useState(['', '', '', '', '']);
  const [submissionClues, setSubmissionClues] = useState(['', '', '', '', '']);
  const [submissionBreakdowns, setSubmissionBreakdowns] = useState(['', '', '', '', '']);
  const [breakdownTouched, setBreakdownTouched] = useState([false, false, false, false, false]);
  const [submissionAuthor, setSubmissionAuthor] = useState('');
  // title is not used in current backend format
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [copying, setCopying] = useState(false);

  const navigate = useNavigate();

  // Check for pre-populated data from Explore page
  useEffect(() => {
    const exploreWords = localStorage.getItem('explorePuzzleWords');
    const exploreClues = localStorage.getItem('explorePuzzleClues');
    
    if (exploreWords && exploreClues) {
      try {
        const words = JSON.parse(exploreWords);
        const clues = JSON.parse(exploreClues);
        
        if (words.length > 0) {
          setSubmissionWords(words);
          setSubmissionClues(clues);
          setSubmissionBreakdowns(words.map(w => String((w || '').length)));
          setBreakdownTouched(Array(words.length).fill(false));
          
          // Clear the localStorage data after using it
          localStorage.removeItem('explorePuzzleWords');
          localStorage.removeItem('explorePuzzleClues');
        }
      } catch (error) {
        console.error('Error parsing explore puzzle data:', error);
      }
    }
  }, []);

  const addWordRow = () => {
    if (submissionWords.length < 15) {
      setSubmissionWords([...submissionWords, '']);
      setSubmissionClues([...submissionClues, '']);
      setSubmissionBreakdowns([...submissionBreakdowns, '']);
      setBreakdownTouched([...breakdownTouched, false]);
    }
  };

  const removeWordRow = (index) => {
    if (submissionWords.length > 1) {
      const newWords = submissionWords.filter((_, i) => i !== index);
      const newClues = submissionClues.filter((_, i) => i !== index);
      const newBreakdowns = submissionBreakdowns.filter((_, i) => i !== index);
      const newTouched = breakdownTouched.filter((_, i) => i !== index);
      setSubmissionWords(newWords);
      setSubmissionClues(newClues);
      setSubmissionBreakdowns(newBreakdowns);
      setBreakdownTouched(newTouched);
    }
  };

  const updateWord = (index, value) => {
    const prevLen = (submissionWords[index] || '').length;
    const newWords = [...submissionWords];
    newWords[index] = value;
    setSubmissionWords(newWords);
    // Auto-default breakdown to current word length until user edits
    const bd = submissionBreakdowns[index] || '';
    const touched = breakdownTouched[index] || false;
    if (!touched || bd === '' || bd === String(prevLen)) {
      const next = [...submissionBreakdowns];
      next[index] = String((value || '').length);
      setSubmissionBreakdowns(next);
    }
  };

  const updateClue = (index, value) => {
    const newClues = [...submissionClues];
    newClues[index] = value;
    setSubmissionClues(newClues);
  };

  const updateBreakdown = (index, value) => {
    const newB = [...submissionBreakdowns];
    newB[index] = value;
    setSubmissionBreakdowns(newB);
    const touched = [...breakdownTouched];
    touched[index] = true;
    setBreakdownTouched(touched);
  };

  const reverseWords = () => {
    setSubmissionWords([...submissionWords].reverse());
    setSubmissionClues([...submissionClues].reverse());
    setSubmissionBreakdowns([...submissionBreakdowns].reverse());
    setBreakdownTouched([...breakdownTouched].reverse());
  };

  const submitPuzzle = async () => {
    setSubmissionStatus('Submitting...');

    // Check that all words and clues are filled
    const hasEmptyWords = submissionWords.some(word => word.trim() === '');
    const hasEmptyClues = submissionClues.some(clue => clue.trim() === '');
    
    if (hasEmptyWords || hasEmptyClues) {
      setSubmissionStatus('Please fill in all words and clues');
      return;
    }

    if (!submissionAuthor.trim()) {
      setSubmissionStatus('Please enter your name');
      return;
    }

    try {
      const rows = submissionWords.map((word, i) => ({
        answer: (word || '').toLowerCase().trim(),
        clue: (submissionClues[i] || '').trim(),
        breakdown: (submissionBreakdowns[i] || '').trim(),
      }));
      const puzzleData = {
        author: submissionAuthor.trim(),
        rows,
        submittedAt: new Date().toISOString(),
      };

      // Try API first, fallback to localStorage
      try {
        const response = await fetch('/api/submit-puzzle.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(puzzleData)
        });

        if (!response.ok) {
          throw new Error('API failed');
        }
      } catch (error) {
        // Fallback to localStorage in puzzle file format
        const submissions = JSON.parse(localStorage.getItem('puzzleSubmissions') || '[]');
        const fallback = { author: puzzleData.author, rows };
        submissions.push(fallback);
        localStorage.setItem('puzzleSubmissions', JSON.stringify(submissions));
      }

      setSubmissionStatus('Puzzle submitted successfully! Thank you for your contribution.');
      
      // Reset form
      setTimeout(() => {
        setSubmissionWords(['', '', '', '', '']);
        setSubmissionClues(['', '', '', '', '']);
        setSubmissionBreakdowns(['', '', '', '', '']);
        setBreakdownTouched([false, false, false, false, false]);
        setSubmissionAuthor('');
        setSubmissionTitle('');
        setSubmissionStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting puzzle:', error);
      setSubmissionStatus('Error submitting puzzle. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold mb-2">Puzzle Creator</h1>
              <p className="text-gray-400">Create and submit your own Stepwords puzzles</p>
              <div className="mt-4">
                <a 
                  href="/explore" 
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Explore word chains →
                </a>
              </div>
            </div>
            <div className="mt-1">
              <button
                onClick={async () => {
                  try {
                    setCopying(true);
                    const words = submissionWords.map(w => (w || '').trim()).filter(Boolean);
                    await navigator.clipboard.writeText(words.join(', '));
                    setTimeout(() => setCopying(false), 900);
                  } catch {
                    setCopying(false);
                  }
                }}
                className="px-3 py-1.5 text-xs rounded border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                disabled={copying}
                title="Copy all words as a comma-separated list"
              >
                {copying ? 'Copied!' : 'Copy words'}
              </button>
            </div>
          </div>
        </div>

        {/* Puzzle Submission Section */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Submit a Puzzle</h2>
            <p className="text-gray-400 mb-4">
              Create and submit your own Stepwords puzzle for review. Each word must be an anagram of the previous word plus exactly one new letter.
            </p>
            
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              {/* Puzzle Info */}
              <div className="mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={submissionAuthor}
                    onChange={(e) => setSubmissionAuthor(e.target.value)}
                    placeholder="e.g., 'John Doe'"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Words and Clues */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Words & Clues</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={reverseWords}
                      disabled={submissionWords.length < 2}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
                      title="Reverse the order of all words and clues"
                    >
                      ↕️ Reverse
                    </button>
                    <button
                      onClick={addWordRow}
                      disabled={submissionWords.length >= 15}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
                    >
                      + Add Word
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {submissionWords.map((word, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                      {/* Remove button - only for words beyond required 3-7 letters */}
                      <div className="md:col-span-1 flex items-end justify-center">
                        {index >= 5 && (
                          <button
                            onClick={() => removeWordRow(index)}
                            className="w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
                            title="Remove this word"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Word {index + 1}</label>
                        <input
                          type="text"
                          value={word}
                          onChange={(e) => updateWord(index, e.target.value)}
                          placeholder={`${3 + index} letters`}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1 whitespace-nowrap">Word breakdown</label>
                        <input
                          type="text"
                          value={submissionBreakdowns[index]}
                          onChange={(e) => updateBreakdown(index, e.target.value)}
                          placeholder={`${(word || '').length}`}
                          title={'e.g. "5" or "3,4"'}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-7">
                        <label className="block text-xs text-gray-400 mb-1">Clue</label>
                        <input
                          type="text"
                          value={submissionClues[index]}
                          onChange={(e) => updateClue(index, e.target.value)}
                          placeholder="Crossword-style clue"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button and Status */}
              <div className="flex items-center justify-between">
                <button
                  onClick={submitPuzzle}
                  disabled={submissionStatus === 'Submitting...'}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {submissionStatus === 'Submitting...' ? 'Submitting...' : 'Submit Puzzle'}
                </button>
                
                {submissionStatus && (
                  <div className={`text-sm ${
                    submissionStatus.includes('successfully') 
                      ? 'text-green-400' 
                      : submissionStatus.includes('Error') || submissionStatus.includes('Please')
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}>
                    {submissionStatus}
                  </div>
                )}
              </div>
            </div>
        </div>

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

export default PuzzleCreatorSimple;
