import React, { useEffect, useRef, useState, useMemo } from "react";
import LetterGrid from "./components/LetterGrid.jsx";
import ShareModal from "./components/ShareModal.jsx";
import HowToPlayModal from "./components/HowToPlayModal.jsx";
import OnScreenKeyboard from "./components/OnScreenKeyboard.jsx";
import { formatDateWithDayOfWeek } from "./lib/date.js";
import { buildEmojiShareGridFrom, computeStepIndices, isPuzzleSolved } from "./lib/gameUtils.js";
// Inline analytics - no separate module needed
export default function Game({ puzzle }) {
  const rows = puzzle.rows; // [{answer, clue}, ...] shortest→longest
  const stepIdx = computeStepIndices(rows);
  
  // Generate a unique key for this puzzle
  const puzzleKey = `stepwords-${puzzle.id || 'default'}`;
  
  // Load saved state or initialize defaults
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(puzzleKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          lockColors: parsed.lockColors || rows.map(r => Array(r.answer.length).fill(null)),
          level: parsed.level || 0,
          guesses: parsed.guesses || rows.map(() => ""),
          cursor: parsed.cursor || 0,
          wasWrong: parsed.wasWrong || rows.map(r => Array(r.answer.length).fill(false)),
          hintsUsed: parsed.hintsUsed || {
            stepLocations: false,
            initialLetters: false,
            stepLetters: false
          },
          hintCount: parsed.hintCount || 0,
          guessCount: parsed.guessCount || 0,
          wrongGuessCount: parsed.wrongGuessCount || 0,
        };
      }
    } catch (e) {
      console.warn('Failed to load saved game state:', e);
    }
    
    // Default state
    return {
      lockColors: rows.map(r => Array(r.answer.length).fill(null)),
      level: 0,
      guesses: rows.map(() => ""),
      cursor: 0,
      wasWrong: rows.map(r => Array(r.answer.length).fill(false)),
      hintsUsed: {
        stepLocations: false,
        initialLetters: false,
        stepLetters: false
      },
      hintCount: 0,
      guessCount: 0,
      wrongGuessCount: 0,
    };
  };

  const savedState = loadSavedState();
  
  const [lockColors, setLockColors] = useState(savedState.lockColors);
  const isLocked = (r, c) => Boolean(lockColors[r]?.[c]);
  const [level, setLevel] = useState(savedState.level);
  const [guesses, setGuesses] = useState(savedState.guesses);
  const [cursor, setCursor] = useState(savedState.cursor);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [ime, setIme] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  // New hint system: 3 types of hints
  const [hintsUsed, setHintsUsed] = useState(savedState.hintsUsed || {
    stepLocations: false,
    initialLetters: false,
    stepLetters: false,
    filterKeyboard: false
  });
  // Colors now simplified: 'G' for correct, 'Y' for hinted or previously incorrect
  const [wasWrong, setWasWrong] = useState(savedState.wasWrong);
  // Session stats
  const [hintCount, setHintCount] = useState(savedState.hintCount);
  const [guessCount, setGuessCount] = useState(savedState.guessCount);
  const [wrongGuessCount, setWrongGuessCount] = useState(savedState.wrongGuessCount);

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showHintsDropdown, setShowHintsDropdown] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  

  // Function to get letters used in all answers
  const lettersUsedInAnswers = useMemo(() => {
    if (!puzzle || !puzzle.rows) {
      return [];
    }
    const allLetters = new Set();
    puzzle.rows.forEach(row => {
      row.answer.toUpperCase().split('').forEach(letter => {
        allLetters.add(letter);
      });
    });
    return Array.from(allLetters).sort();
  }, [puzzle]);

  // New hint functions
  function useHint(hintType) {
    if (hintsUsed[hintType]) return; // Already used
    
    const newHintsUsed = { ...hintsUsed, [hintType]: true };
    
    // If using step letters, also enable step locations
    if (hintType === 'stepLetters') {
      newHintsUsed.stepLocations = true;
    }
    
    setHintsUsed(newHintsUsed);
    setHintCount(prev => prev + 1);
    
    // Track hint usage
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'hint_used', { 
          hint_type: hintType, 
          puzzle_id: puzzle.id || 'unknown' 
        });
      }
    } catch (error) {
      // Silently fail
    }
    
    // Apply the hint effects
    if (hintType === 'initialLetters') {
      applyInitialLettersHint();
    } else if (hintType === 'stepLetters') {
      applyStepLettersHint();
    }
  }
  
  function applyInitialLettersHint() {
    const newLockColors = lockColors.map((rowColors, rowIndex) => {
      const newRowColors = [...rowColors];
      // Reveal first letter of each word
      if (newRowColors[0] === null) {
        newRowColors[0] = "Y"; // Yellow for hinted
      }
      return newRowColors;
    });
    
    // Update all guesses at once
    const newGuesses = guesses.map((guess, rowIndex) => {
      const ans = rows[rowIndex].answer.toUpperCase();
      const currentGuess = (guess || "").toUpperCase();
      
      if (newLockColors[rowIndex][0] === "Y") {
        return ans[0] + currentGuess.slice(1);
      }
      
      return currentGuess;
    });
    
    setLockColors(newLockColors);
    setGuesses(newGuesses);
  }
  
  function applyStepLettersHint() {
    const newLockColors = lockColors.map((rowColors, rowIndex) => {
      const newRowColors = [...rowColors];
      const stepCol = stepIdx[rowIndex]; // This is a single number, not an array
      
      // Reveal step letter (the new letter added) - skip first row (stepCol === -1)
      if (stepCol !== -1 && stepCol !== undefined && newRowColors[stepCol] === null) {
        newRowColors[stepCol] = "Y"; // Yellow for hinted
      }
      return newRowColors;
    });
    
    // Update all guesses at once
    const newGuesses = guesses.map((guess, rowIndex) => {
      const stepCol = stepIdx[rowIndex]; // This is a single number, not an array
      const ans = rows[rowIndex].answer.toUpperCase();
      const ansLen = ans.length;
      let newGuess = (guess || "").toUpperCase();
      
      // Check if this step column was just revealed (was null before, now Y)
      if (stepCol !== -1 && stepCol !== undefined && 
          lockColors[rowIndex][stepCol] === null && newLockColors[rowIndex][stepCol] === "Y") {
        // Pad the guess to the correct length first
        newGuess = newGuess.padEnd(ansLen, " ").slice(0, ansLen);
        // Then insert the step letter at the correct position
        newGuess = newGuess.slice(0, stepCol) + ans[stepCol] + newGuess.slice(stepCol + 1);
        // Remove trailing spaces
        newGuess = newGuess.trimEnd();
      }
      
      return newGuess;
    });
    
    setLockColors(newLockColors);
    setGuesses(newGuesses);
  }


  const rowLen = (r) => rows[r].answer.length;

  useEffect(() => {
    setMessage("");
  }, [level]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      // Only consider it mobile if it's actually a mobile device, not just small screen
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Focus input on desktop
  useEffect(() => {
    console.log('Focus effect:', { isMobile, hasInput: !!inputRef.current });
    if (!isMobile && inputRef.current) {
      inputRef.current.focus();
      console.log('Input focused');
    }
  }, [level, isMobile]);

  // Close hints dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHintsDropdown && !event.target.closest('.hints-dropdown')) {
        setShowHintsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHintsDropdown]);

  // Show how to play modal on first visit and track puzzle start
  useEffect(() => {
    const hasSeenHowToPlay = localStorage.getItem('stepwords-how-to-play');
    if (!hasSeenHowToPlay) {
      setShowHowToPlay(true);
    }
    
    // Track puzzle start
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'puzzle_started', { 
          puzzle_id: puzzle.id || 'unknown' 
        });
      }
    } catch (error) {
      // Silently fail
    }
  }, [puzzle.id]);

  const handleCloseHowToPlay = () => {
    setShowHowToPlay(false);
    localStorage.setItem('stepwords-how-to-play', 'true');
  };

  // Save game state to localStorage
  const saveGameState = () => {
    try {
      const stateToSave = {
        lockColors,
        level,
        guesses,
        cursor,
        wasWrong,
        hintsUsed,
        hintCount,
        guessCount,
        wrongGuessCount,
      };
      localStorage.setItem(puzzleKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  };

  // Save state whenever it changes
  useEffect(() => {
    saveGameState();
  }, [lockColors, level, guesses, cursor, wasWrong, hintsUsed, hintCount, guessCount, wrongGuessCount]);


  const clue = rows[level].clue;

  function setGuessAt(i, next) {
    setGuesses(prev => prev.map((g, idx) => (idx === i ? next : g)));
  }

  function nearestUnlockedInRow(row, col) {
    const len = rowLen(row);
    if (!isBlocked(row, col)) return col;
    for (let d = 1; d < len; d++) {
      const r = col + d, l = col - d;
      if (r < len && !isBlocked(row, r)) return r;
      if (l >= 0 && !isBlocked(row, l)) return l;
    }
    return -1;
  }

  function stepCursorInRow(dir) {
    const len = rowLen(level);
    let col = cursor;
    for (let t = 0; t < len; t++) {
      col += dir;
      if (col < 0 || col >= len) break;
      if (!isBlocked(level, col)) { setCursor(col); return; }
    }
  }

  function moveLevel(delta) {
    setLevel((l) => {
      const next = (l + delta + rows.length) % (rows.length)
      const len = rowLen(next);
      let target = Math.min(len - 1, cursor);
      if (isBlocked(next, target)) {
        const n = nearestUnlockedInRow(next, target);
        target = n === -1 ? 0 : n;
      }
      setCursor(target);
      return next;
    });
  }

  function typeChar(ch) {
    const len = rowLen(level);

    // If current cell is blocked (locked or hint-revealed), jump to the next available
    if (isBlocked(level, cursor)) {
      const nextPos = nearestUnlockedInRow(level, cursor);
      if (nextPos === -1) return; // row fully blocked
      setCursor(nextPos);
    }

    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    const next = (cur.slice(0, cursor) + ch.toUpperCase() + cur.slice(cursor + 1))
      .slice(0, len).trimEnd();
    setGuessAt(level, next);

    // Advance to the next available (skip blocked)
    let pos = cursor;
    for (let t = 0; t < len; t++) {
      pos += 1;
      if (pos >= len) break;
      if (!isBlocked(level, pos)) { setCursor(pos); break; }
    }
    setMessage("");
  }

  function submitRow(i) {
    const ans = rows[i].answer.toUpperCase();
    const len = ans.length;
    const cur = (guesses[i] || "").toUpperCase().padEnd(len, " ").slice(0, len);

    const nextGuess = Array.from(cur);
    const rowColors = lockColors[i].slice();
    const nextWasWrongRow = wasWrong[i].slice();
    let wrongsThisSubmit = 0;

    for (let k = 0; k < len; k++) {
      const guessed = cur[k];
      const correct = ans[k];
      const prior = rowColors[k]; // may be 'Y' if hinted earlier, or 'G' if already correct
      if (guessed === correct && guessed !== " ") {
        // Preserve yellow if hinted; otherwise yellow if was previously wrong; else green
        rowColors[k] = prior === "Y" ? "Y" : (nextWasWrongRow[k] ? "Y" : "G");
      } else if (guessed !== " ") {
        // Record that this position has been guessed incorrectly at least once
        nextWasWrongRow[k] = true;
        // Clear the incorrect guess
        nextGuess[k] = " ";
        // Do not change existing color (keep prior lock if already correct or hinted)
        wrongsThisSubmit += 1;
      }
    }

    // Snapshot colors *after* this row submit
    const colorsAfter = lockColors.map(r => r.slice());
    colorsAfter[i] = rowColors;
    const wasWrongAfter = wasWrong.map(r => r.slice());
    wasWrongAfter[i] = nextWasWrongRow;

    setGuessAt(i, nextGuess.join("").trimEnd());
    setWasWrong(wasWrongAfter);
    setGuessCount((n) => n + 1);
    if (wrongsThisSubmit > 0) setWrongGuessCount((n) => n + wrongsThisSubmit);

    const solvedThisRow = rowColors.every(Boolean);

    if (solvedThisRow) {
      // ✅ Only consider the puzzle solved if *every* row is fully colored
      if (isPuzzleSolved(colorsAfter, rows)) {
        setLockColors(colorsAfter);

        setMessage("🎉 You solved all the Stepwords!");
        const share = buildEmojiShareGridFrom(rows, colorsAfter);
        setShareText(share);
        setShowShare(true);
        
        // Track game completion
        try {
          if (window.gtag && typeof window.gtag === 'function') {
            window.gtag('event', 'game_completed', {
              puzzle_id: puzzle.id || 'unknown',
              hints_used: hintCount,
              total_guesses: guessCount,
              wrong_guesses: wrongGuessCount,
              completion_time: Date.now() - (gameStartTime || Date.now())
            });
          }
        } catch (error) {
          // Silently fail
        }
        
        // Clear saved state when puzzle is completed
        localStorage.removeItem(puzzleKey);
        
        // Mark puzzle as completed
        const completedPuzzles = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
        if (!completedPuzzles.includes(puzzle.id)) {
          completedPuzzles.push(puzzle.id);
          localStorage.setItem('stepwords-completed', JSON.stringify(completedPuzzles));
        }
        return;
      }

      // Not fully solved yet → advance if there’s a next row
      setLockColors(colorsAfter);
      if (i + 1 < rows.length) {
        const nextRow = i + 1;
        setLevel(nextRow);
        const firstOpen = nearestUnlockedInRow(nextRow, 0);
        setCursor(firstOpen === -1 ? 0 : firstOpen);
        setMessage("Nice! Next word →");
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        // Last row solved but earlier rows aren’t → encourage finishing the rest
        setMessage("This row is done. Finish the others to complete the puzzle!");
      }
      return;
    }

    // Row not solved → commit and prompt to keep going
    setLockColors(colorsAfter);
    setMessage("Kept correct letters. Try filling the rest.");
  }

  // Keyboard event handlers (desktop)
  function onKeyDown(e) {
    console.log('Key pressed:', e.key, 'isMobile:', isMobile);
    if (isMobile) return; // Only handle keyboard on desktop
    
    // Let browser/system shortcuts work (Cmd/Ctrl combos, F5, etc.)
    if (e.metaKey || e.ctrlKey) return;
    if (e.key === "F5") return;
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;

    if (e.key === "Tab") { e.preventDefault(); moveLevel(e.shiftKey ? -1 : 1); return; }
    if (e.key === "Enter") { e.preventDefault(); submitRow(level); return; }
    if (e.key === "Backspace") {
      e.preventDefault();
      handleBackspace();
      return;
    }

    if (e.key === "ArrowLeft") { e.preventDefault(); stepCursorInRow(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); stepCursorInRow(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (level > 0) moveLevel(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (level < rows.length - 1) moveLevel(1); return; }
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); typeChar(e.key); return; }
  }

  function onTextInput(e) {
    if (isMobile) return; // Only handle on desktop
    const v = e.target.value || "";
    const letters = v.match(/[a-zA-Z]/g);
    if (letters && letters.length) typeChar(letters[letters.length - 1]);
    setIme("");
  }

  // On-screen keyboard handlers (mobile)
  const handleKeyPress = (key) => {
    typeChar(key);
  };

  const handleEnter = () => {
    submitRow(level);
  };

  const handleBackspace = () => {
    const len = rowLen(level);
    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);

    // If current tile is blocked (solved/hinted), jump left to nearest editable
    if (isBlocked(level, cursor)) {
      let pos = cursor - 1;
      while (pos >= 0 && isBlocked(level, pos)) pos--;
      if (pos >= 0) setCursor(pos);
      return;
    }

    // Clear current square (only if editable)
    const updated = cur.slice(0, cursor) + " " + cur.slice(cursor + 1);
    setGuessAt(level, updated.trimEnd());

    // Move cursor left to previous editable (if any)
    let pos = cursor - 1;
    while (pos >= 0 && isBlocked(level, pos)) pos--;
    setCursor(Math.max(0, pos >= 0 ? pos : 0));
  };

  // Treat both real locks and hint-reveals as "blocked"
  function isBlocked(rowIndex, colIndex) {
    return isLocked(rowIndex, colIndex);
  }



  return (
    <>
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="px-3 text-center pt-4">
        {/* Smaller date on mobile */}
        {puzzle.date && (
          <div className="text-sm sm:text-lg md:text-xl font-bold text-gray-100 mb-1">
            {formatDateWithDayOfWeek(puzzle.date)}
          </div>
        )}
        {/* Author byline */}
        {puzzle.author && (
          <div className="text-xs sm:text-sm text-gray-400 mb-2">
            By {puzzle.author}
          </div>
        )}
        {/* Puzzle title */}
        <div className="text-xs sm:text-base text-gray-300 italic mb-2">
          {puzzle.title}
        </div>
      </div>
      
      <div className="w-full px-3 py-2 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 z-20">
        <div className="flex items-center gap-2">
          {/* Empty left side */}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative hints-dropdown">
            <button
              onClick={() => setShowHintsDropdown(!showHintsDropdown)}
              className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
            >
              Hints {hintCount > 0 && `(${hintCount})`}
            </button>
            
            {showHintsDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
                <button
                  onClick={() => {
                    useHint('stepLocations');
                    setShowHintsDropdown(false);
                  }}
                  disabled={hintsUsed.stepLocations}
                  className={
                    "w-full text-left px-3 py-2 text-xs border-b border-gray-600 " +
                    (hintsUsed.stepLocations
                      ? "text-amber-300 bg-amber-900/20 cursor-default"
                      : "text-gray-300 hover:bg-gray-700")
                  }
                >
                  {hintsUsed.stepLocations ? "✓ Reveal step locations" : "Reveal step locations"}
                </button>
                <button
                  onClick={() => {
                    useHint('initialLetters');
                    setShowHintsDropdown(false);
                  }}
                  disabled={hintsUsed.initialLetters}
                  className={
                    "w-full text-left px-3 py-2 text-xs border-b border-gray-600 " +
                    (hintsUsed.initialLetters
                      ? "text-blue-300 bg-blue-900/20 cursor-default"
                      : "text-gray-300 hover:bg-gray-700")
                  }
                >
                  {hintsUsed.initialLetters ? "✓ Reveal first letters" : "Reveal first letters"}
                </button>
                <button
                  onClick={() => {
                    useHint('filterKeyboard');
                    setShowHintsDropdown(false);
                  }}
                  disabled={hintsUsed.filterKeyboard}
                  className={
                    "w-full text-left px-3 py-2 text-xs border-b border-gray-600 " +
                    (hintsUsed.filterKeyboard
                      ? "text-purple-300 bg-purple-900/20 cursor-default"
                      : "text-gray-300 hover:bg-gray-700")
                  }
                >
                  {hintsUsed.filterKeyboard ? "✓ Filter keyboard" : "Filter keyboard"}
                </button>
                <button
                  onClick={() => {
                    useHint('stepLetters');
                    setShowHintsDropdown(false);
                  }}
                  disabled={hintsUsed.stepLetters}
                  className={
                    "w-full text-left px-3 py-2 text-xs " +
                    (hintsUsed.stepLetters
                      ? "text-green-300 bg-green-900/20 cursor-default"
                      : "text-gray-300 hover:bg-gray-700")
                  }
                >
                  {hintsUsed.stepLetters ? "✓ Reveal step letters" : "Reveal step letters"}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
          >
            How to Play
          </button>
        </div>
      </div>

      <div className="w-full px-3 py-2 sticky top-[48px] bg-black/80 backdrop-blur border-b border-gray-800 z-10">
        <div className="text-sm text-gray-300">
          <span className="font-semibold">Clue:</span> {clue}
        </div>
      </div>



      <div 
        className="flex-1 overflow-y-auto pt-2"
        onClick={() => {
          console.log('Click handler:', { isMobile, hasInput: !!inputRef.current });
          if (!isMobile && inputRef.current) {
            inputRef.current.focus();
            console.log('Input focused from click');
          }
        }}
      >
        {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        onKeyDown={onKeyDown}
        onChange={onTextInput}
        value={ime}
          onBlur={() => {
            if (!isMobile) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          inputMode={isMobile ? "none" : "latin"}
        enterKeyHint="done"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
          className="absolute opacity-0 -left-[9999px] w-px h-px"
        aria-hidden
      />

        <LetterGrid
          rows={rows}
          guesses={guesses}
          lockColors={lockColors}
          stepIdx={stepIdx}
          stepsRevealed={hintsUsed.stepLocations}
          level={level}
          cursor={cursor}
          onTileClick={(i, col) => {
                        setLevel(i);
                        setCursor(col);
            if (!isMobile) {
                        inputRef.current?.focus();
                      }
                    }}
                  />

        <div className="h-6 mt-3 text-xs text-gray-300 px-3 pb-32">{message}</div>
      </div>

      {/* Sticky keyboard at bottom */}
      <OnScreenKeyboard
        onKeyPress={handleKeyPress}
        onEnter={handleEnter}
        onBackspace={handleBackspace}
        filteredLetters={hintsUsed.filterKeyboard ? lettersUsedInAnswers : null}
      />
   
      {showShare && (
        <ShareModal
          shareText={shareText}
          hintCount={hintCount}
          wrongGuessCount={wrongGuessCount}
          guessCount={guessCount}
          rowsLength={rows.length}
          onClose={() => {
            setShowShare(false);
            // Track share action
            try {
              if (window.gtag && typeof window.gtag === 'function') {
                window.gtag('event', 'puzzle_shared', {
                  puzzle_id: puzzle.id || 'unknown',
                  hints_used: hintCount,
                  total_guesses: guessCount
                });
              }
            } catch (error) {
              // Silently fail
            }
          }}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={handleCloseHowToPlay} />
      )}
    </div>

    </>
  );
}
