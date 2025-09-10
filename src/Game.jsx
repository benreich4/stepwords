import React, { useEffect, useRef, useState } from "react";
import LetterGrid from "./components/LetterGrid.jsx";
import ShareModal from "./components/ShareModal.jsx";
import HowToPlayModal from "./components/HowToPlayModal.jsx";
import OnScreenKeyboard from "./components/OnScreenKeyboard.jsx";
import { formatLongDate } from "./lib/date.js";
import { buildEmojiShareGridFrom, computeStepIndices, isPuzzleSolved } from "./lib/gameUtils.js";
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
          stepsRevealed: parsed.stepsRevealed || false,
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
      stepsRevealed: false,
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
  // Hint system: arm once, then reveal by tapping any confirmed letter (green)
  const [hintArmed, setHintArmed] = useState(false);
  // Colors now simplified: 'G' for correct, 'Y' for hinted or previously incorrect
  const [wasWrong, setWasWrong] = useState(savedState.wasWrong);
  // Step reveal: hidden by default; once revealed, cannot be hidden
  const [stepsRevealed, setStepsRevealed] = useState(savedState.stepsRevealed);
  // Session stats
  const [hintCount, setHintCount] = useState(savedState.hintCount);
  const [guessCount, setGuessCount] = useState(savedState.guessCount);
  const [wrongGuessCount, setWrongGuessCount] = useState(savedState.wrongGuessCount);

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  

  function applyHintSingle(row, col) {
    const ans = rows[row].answer.toUpperCase();
    const len = ans.length;
    const correct = ans[col];
    if (!correct) return;

    if (lockColors[row]?.[col]) return;

    const cur = (guesses[row] || "").toUpperCase().padEnd(len, " ").slice(0, len).split("");
    cur[col] = correct;
    const nextRowColors = lockColors[row].slice();
    // Hinted squares are shown in yellow even if correct
    nextRowColors[col] = "Y";

    setGuessAt(row, cur.join("").trimEnd());
    setLockColors(prev => prev.map((r, i) => (i === row ? nextRowColors : r)));
    setHintCount((n) => n + 1);

    const solved = nextRowColors.every(Boolean);
    if (solved) {
      if (row + 1 < rows.length) {
        const nextRow = row + 1;
        setLevel(nextRow);
        const firstOpen = nearestUnlockedInRow(nextRow, 0);
        setCursor(firstOpen === -1 ? 0 : firstOpen);
        setMessage("Nice! Next word →");
      } else {
        setMessage("🎉 You solved all the Stepwords!");
      }
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    let target = col;
    for (let k = col + 1; k < len; k++) {
      if (!nextRowColors[k]) { target = k; break; }
    }
    setLevel(row);
    setCursor(target);
    requestAnimationFrame(() => inputRef.current?.focus());
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

  // Show how to play modal on first visit
  useEffect(() => {
    const hasSeenHowToPlay = localStorage.getItem('stepwords-how-to-play');
    if (!hasSeenHowToPlay) {
      setShowHowToPlay(true);
    }
  }, []);

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
        stepsRevealed,
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
  }, [lockColors, level, guesses, cursor, wasWrong, stepsRevealed, hintCount, guessCount, wrongGuessCount]);


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
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="px-3 text-center pt-4">
        {/* Smaller date on mobile */}
        {puzzle.date && (
          <div className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-100 mb-1">
            {formatLongDate(puzzle.date)}
          </div>
        )}
        {/* Author byline */}
        {puzzle.author && (
          <div className="text-xs sm:text-sm text-gray-400 mb-3">
            By {puzzle.author}
          </div>
        )}
        {/* Puzzle title */}
        <div className="text-sm sm:text-base text-gray-300 italic mb-3">
          {puzzle.title}
        </div>
      </div>
      
      <div className="w-full px-3 py-2 flex items-center gap-2 sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHintArmed((v) => !v)}
            className={
              "px-3 py-1.5 rounded-md text-xs border " +
              (hintArmed
                ? "border-sky-500 text-sky-300 bg-sky-900/30"
                : "border-gray-700 text-gray-300 hover:bg-gray-900/40")
            }
            aria-pressed={hintArmed}
          >
            {hintArmed ? "Reveal letter" : "Hint"}
          </button>
          <button
            onClick={() => setStepsRevealed(true)}
            disabled={stepsRevealed}
            className={
              "px-3 py-1.5 rounded-md text-xs border " +
              (stepsRevealed
                ? "border-amber-500 text-amber-300 bg-amber-900/30 cursor-default"
                : "border-gray-700 text-gray-300 hover:bg-gray-900/40")
            }
            aria-pressed={stepsRevealed}
          >
            {stepsRevealed ? "Steps revealed" : "Reveal steps"}
          </button>
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
        className="flex-1 overflow-y-auto"
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
          stepsRevealed={stepsRevealed}
          level={level}
          cursor={cursor}
          onTileClick={(i, col) => {
            if (hintArmed) {
              applyHintSingle(i, col);
              setHintArmed(false);
            } else {
              setLevel(i);
              setCursor(col);
              if (!isMobile) {
                inputRef.current?.focus();
              }
            }
          }}
        />

        <div className="h-6 mt-3 text-xs text-gray-300 px-3 pb-24">{message}</div>
      </div>

      {/* Sticky keyboard at bottom */}
      <OnScreenKeyboard
        onKeyPress={handleKeyPress}
        onEnter={handleEnter}
        onBackspace={handleBackspace}
      />
   
      {showShare && (
        <ShareModal
          shareText={shareText}
          hintCount={hintCount}
          wrongGuessCount={wrongGuessCount}
          guessCount={guessCount}
          rowsLength={rows.length}
          onClose={() => setShowShare(false)}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={handleCloseHowToPlay} />
      )}
    </div>
  );
}
