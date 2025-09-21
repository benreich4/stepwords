import React, { useEffect, useRef, useState, useMemo } from "react";
import LetterGrid from "./components/LetterGrid.jsx";
import ShareModal from "./components/ShareModal.jsx";
import HowToPlayModal from "./components/HowToPlayModal.jsx";
import OnScreenKeyboard from "./components/OnScreenKeyboard.jsx";
import Toast from "./components/Toast.jsx";
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
          rowsInitialHintUsed: parsed.rowsInitialHintUsed || rows.map(() => false),
          rowsStepHintUsed: parsed.rowsStepHintUsed || rows.map(() => false),
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
      rowsInitialHintUsed: rows.map(() => false),
      rowsStepHintUsed: rows.map(() => false),
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
  const [enterTipShown, setEnterTipShown] = useState(() => {
    try { return localStorage.getItem('stepwords-enter-tip-shown') === '1'; } catch { return false; }
  });
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState("info"); // info | success | warning
  const toastTimerRef = useRef(null);
  const [dragStartRow, setDragStartRow] = useState(null);
  const [dragOverRow, setDragOverRow] = useState(null);
  const [diffTipShown, setDiffTipShown] = useState(() => {
    try { return localStorage.getItem('stepwords-diff-tip-shown') === '1'; } catch { return false; }
  });

  function showToast(text, durationMs = 2500, variant = "info") {
    setToast(text || "");
    setToastVariant(variant || "info");
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (text) {
      toastTimerRef.current = setTimeout(() => {
        setToast("");
        toastTimerRef.current = null;
      }, durationMs);
    }
  }
  // Expose setters for drag diff to child grid (avoids prop drilling handlers)
  useEffect(() => {
    window.__setDragStartRow = (v) => {
      setDragStartRow(v);
      if (v != null && !diffTipShown) {
        showToast('Hold a row number, then drag to another to compare letters', 2600, 'info');
        setDiffTipShown(true);
        try { localStorage.setItem('stepwords-diff-tip-shown', '1'); } catch {}
      }
    };
    window.__setDragOverRow = (v) => setDragOverRow(v);
    return () => {
      try { delete window.__setDragStartRow; delete window.__setDragOverRow; } catch {}
    };
  }, [diffTipShown]);
  const inputRef = useRef(null);
  const [ime, setIme] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  // Settings (persisted)
  const [settings, setSettings] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}');
      return { hardMode: s.hardMode === true, easyMode: s.easyMode === true };
    } catch {
      return { hardMode: false, easyMode: false };
    }
  });
  useEffect(() => {
    try { localStorage.setItem('stepwords-settings', JSON.stringify({ hardMode: settings.hardMode, easyMode: settings.easyMode })); } catch {}
  }, [settings]);
  const [showSettings, setShowSettings] = useState(false);
  // Easy mode now saved globally in settings (like hardMode)
  // New hint system: 2 per-row hints (initialLetters, stepLetters). Keyboard filter moved to settings as Easy mode
  const [hintsUsed] = useState(savedState.hintsUsed || { initialLetters: false, stepLetters: false, filterKeyboard: false });
  const [rowsInitialHintUsed] = useState(savedState.rowsInitialHintUsed || rows.map(() => false));
  const [rowsStepHintUsed] = useState(savedState.rowsStepHintUsed || rows.map(() => false));
  // Colors now simplified: 'G' for correct, 'Y' for hinted or previously incorrect
  const [wasWrong, setWasWrong] = useState(savedState.wasWrong);
  // Session stats
  const [hintCount, setHintCount] = useState(savedState.hintCount);
  const [guessCount, setGuessCount] = useState(savedState.guessCount);
  const [wrongGuessCount, setWrongGuessCount] = useState(savedState.wrongGuessCount);

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [gameStartTime] = useState(Date.now());
  

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

  // Reveal a specific tile by clicking it after activating 'Reveal letter'
  function revealTileAt(rowIndex, colIndex) {
    const ans = rows[rowIndex].answer.toUpperCase();
    if (!ans || colIndex < 0 || colIndex >= ans.length) return;
    if (lockColors[rowIndex]?.[colIndex]) return; // already revealed/locked

    const newLockColors = lockColors.map((rc) => rc.slice());
    newLockColors[rowIndex][colIndex] = "Y";

    const len = ans.length;
    const newGuesses = guesses.map((g, r) => {
      if (r !== rowIndex) return g;
      let cur = (g || "").toUpperCase().padEnd(len, " ").slice(0, len);
      cur = cur.slice(0, colIndex) + ans[colIndex] + cur.slice(colIndex + 1);
      return cur.trimEnd();
    });

    setLockColors(newLockColors);
    setGuesses(newGuesses);
    setHintCount((n) => n + 1);
    showToast("Revealed letter.", 2000, "info");
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'hint_used', { hint_type: 'reveal_letter', puzzle_id: puzzle.id || 'unknown' });
      }
    } catch {}
  }


  const rowLen = (r) => rows[r].answer.length;

  useEffect(() => {
    setMessage("");
  }, [level]);

  // Detect mobile vs tablet devices
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      const likelyTabletUA = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
      const hasTouch = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
      const wideScreen = window.innerWidth >= 768; // iPad-ish breakpoint
      const tablet = likelyTabletUA || (hasTouch && wideScreen);
      const phone = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) && !tablet;
      setIsTablet(Boolean(tablet));
      setIsMobile(Boolean(phone));
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

  // Hints dropdown removed; no-op

  // Show how to play modal on first visit and track puzzle start
  useEffect(() => {
    const hasSeenHowToPlay = localStorage.getItem('stepwords-how-to-play');
    if (!hasSeenHowToPlay) {
      setShowHowToPlay(true);
    }
    
    // If puzzle already completed previously, immediately show share modal
    try {
      const completed = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
      if (completed.includes(puzzle.id)) {
        const share = buildEmojiShareGridFrom(rows, lockColors);
        setShareText(share);
        setShowShare(true);
      }
    } catch {}

    // Track puzzle start
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'puzzle_started', { 
          puzzle_id: puzzle.id || 'unknown' 
        });
      }
    } catch (_err) { void 0; }
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
        rowsInitialHintUsed,
        rowsStepHintUsed,
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

  // Compute referenced rows from the current clue text (only [n] form)
  const referencedRows = useMemo(() => {
    const set = new Set();
    const regex = /\[(\d+)\]/g;
    let m;
    while ((m = regex.exec(clue || "")) !== null) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1 && n <= rows.length) set.add(n - 1);
    }
    return set;
  }, [clue, rows.length]);

  function renderClueText(text) {
    // Only single-number references like [4] are recognized.
    const nodes = [];
    const regex = /\[(\d+)\]/g;
    let last = 0; let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1 && n <= rows.length) {
        const jumpIndex = n - 1;
        nodes.push(
          <button
            key={`ref-${m.index}`}
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded border bg-yellow-700/30 border-yellow-400 text-yellow-200 text-[9px] leading-none hover:bg-yellow-700/40 align-middle -translate-y-[1px]"
            onClick={() => {
              setLevel(jumpIndex);
              const firstOpen = nearestUnlockedInRow(jumpIndex, 0);
              setCursor(firstOpen === -1 ? 0 : firstOpen);
              if (!isMobile) inputRef.current?.focus();
            }}
            aria-label={`Jump to row ${n}`}
          >
            {String(n)}
          </button>
        );
      } else {
        nodes.push(text.slice(m.index, regex.lastIndex));
      }
      last = regex.lastIndex;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  }

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

  function isCellFilled(rowIndex, colIndex) {
    const len = rowLen(rowIndex);
    const g = (guesses[rowIndex] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    return g[colIndex] !== " ";
  }

  function nearestEmptyEditableInRow(rowIndex, startColInclusive) {
    const len = rowLen(rowIndex);
    for (let pos = Math.max(0, startColInclusive); pos < len; pos++) {
      if (!isBlocked(rowIndex, pos) && !isCellFilled(rowIndex, pos)) return pos;
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
    // Determine target position respecting locks
    let targetPos = cursor;
    // If current tile is locked, move to next empty editable; otherwise allow overwrite even if filled
    if (isBlocked(level, targetPos)) {
      const nextPos = nearestEmptyEditableInRow(level, targetPos);
      if (nextPos === -1) return; // no space to type
      targetPos = nextPos;
      setCursor(nextPos);
    }

    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    const overwriteMode = cur[targetPos] !== " " && !isBlocked(level, targetPos);
    const next = (cur.slice(0, targetPos) + ch.toUpperCase() + cur.slice(targetPos + 1))
      .slice(0, len).trimEnd();
    setGuessAt(level, next);

    // Advance to the next available (skip blocked)
    let pos = targetPos + 1;
    while (pos < len) {
      if (!isBlocked(level, pos)) {
        if (overwriteMode || !isCellFilled(level, pos)) { setCursor(pos); break; }
      }
      pos += 1;
    }
    // If first-time user and row became fully filled, show a one-time top toast
    if (!enterTipShown) {
      const after = (next.padEnd(len, " ").slice(0, len)).toUpperCase();
      let full = true;
      for (let col = 0; col < len; col++) {
        if (!isBlocked(level, col) && after[col] === " ") { full = false; break; }
      }
      if (full) {
        setEnterTipShown(true);
        try { localStorage.setItem('stepwords-enter-tip-shown', '1'); } catch {}
        showToast("Press Enter to submit", 2500, "warning");
      }
    }
    setMessage("");
  }

  function submitRow(i) {
    // If this row is already fully correct (all green), ignore submit and do not count a guess
    if (lockColors[i] && lockColors[i].length && lockColors[i].every((c) => c === 'G')) {
      return;
    }

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

        showToast("🎉 You solved all the Stepwords!", 2800, "success");
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
        } catch (_err) { void 0; }
        
        // Clear saved state when puzzle is completed
        localStorage.removeItem(puzzleKey);
        
        // Mark puzzle as completed
        const completedPuzzles = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
        if (!completedPuzzles.includes(puzzle.id)) {
          completedPuzzles.push(puzzle.id);
          localStorage.setItem('stepwords-completed', JSON.stringify(completedPuzzles));
        }

        // Record perfect result (no hints, no wrong guesses)
        try {
          if (hintCount === 0 && wrongGuessCount === 0) {
            const perfect = JSON.parse(localStorage.getItem('stepwords-perfect') || '[]');
            if (!perfect.includes(puzzle.id)) {
              perfect.push(puzzle.id);
              localStorage.setItem('stepwords-perfect', JSON.stringify(perfect));
            }
          }
        } catch (_e) { /* ignore */ }
        return;
      }

      // Not fully solved yet → advance if there’s a next row
      setLockColors(colorsAfter);
      if (i + 1 < rows.length) {
        const nextRow = i + 1;
        setLevel(nextRow);
        const firstOpen = nearestUnlockedInRow(nextRow, 0);
        setCursor(firstOpen === -1 ? 0 : firstOpen);
        showToast("Nice! Next word →", 2000, "success");
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        // Last row solved but earlier rows aren’t → encourage finishing the rest
        showToast("This row is done. Finish the others to complete the puzzle!", 2600, "info");
      }
      return;
    }

    // Row not solved → commit and prompt to keep going
    setLockColors(colorsAfter);
    showToast("Kept correct letters. Try filling the rest.", 2400, "warning");
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
    if (e.key === "Enter") { e.preventDefault(); handleEnter(); return; }
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
    const len = rowLen(level);
    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    // Allow partial submissions, but not empty (consider only editable cells)
    let hasAnyFilled = false;
    for (let col = 0; col < len; col++) {
      if (!isBlocked(level, col) && cur[col] !== " ") {
        hasAnyFilled = true;
        break;
      }
    }
    if (!hasAnyFilled) {
      showToast("Type at least one letter to submit", 2200, "warning");
      return; // ignore Enter if empty
    }
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
    <div className="w-screen h-[105vh] bg-black flex flex-col">
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
        <div className="flex items-center gap-2" />
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRevealConfirm(true)}
            className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
          >
            Reveal letter {hintCount > 0 && `(${hintCount})`}
          </button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
          >
            How to Play
          </button>
          {/* Settings gear moved to right */}
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
              aria-label="Settings"
            >
              ⚙️
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 text-xs">
                <label className="flex items-center justify-between py-1">
                  <span className="text-gray-300">Hard mode</span>
                  <input
                    type="checkbox"
                    checked={settings.hardMode}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSettings(s => ({ ...s, hardMode: checked }));
                      if (checked) {
                        try {
                          if (window.gtag && typeof window.gtag === 'function') {
                            window.gtag('event', 'hard_mode_turned_on', { puzzle_id: puzzle.id || 'unknown' });
                          }
                        } catch {}
                      }
                    }}
                  />
                </label>
                <div className="text-[10px] text-gray-400 mb-2">Hides step locations (🪜) until revealed. Saved as your default.</div>

                <label className="flex items-center justify-between py-1">
                  <span className="text-gray-300">Easy mode</span>
                  <input
                    type="checkbox"
                    checked={settings.easyMode}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSettings(s => ({ ...s, easyMode: checked }));
                      if (checked) {
                        try {
                          if (window.gtag && typeof window.gtag === 'function') {
                            window.gtag('event', 'easy_mode_turned_on', { puzzle_id: puzzle.id || 'unknown' });
                          }
                        } catch {}
                      }
                    }}
                  />
                </label>
                <div className="text-[10px] text-gray-400">Filters keyboard to letters in this puzzle. Saved as your default.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top toast */}
      <Toast text={toast} variant={toastVariant} />

      <div className="w-full px-3 py-2 sticky top-[48px] bg-black/80 backdrop-blur border-b border-gray-800 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => moveLevel(-1)}
            aria-label="Previous word"
            className="px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-gray-900/40"
          >
            ←
          </button>
          <div className="text-sm text-gray-300 mx-2 flex-1 text-center">
            <span className="font-semibold">Clue:</span> {renderClueText(clue)}
          </div>
        <button
            onClick={() => moveLevel(1)}
            aria-label="Next word"
            className="px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-gray-900/40"
          >
            →
        </button>
        </div>
      </div>



      <div 
        id="grid-scroll"
        className="flex-1 overflow-y-auto pt-2 pb-8"
        onClick={() => {
          if (!isMobile && inputRef.current) {
            inputRef.current.focus();
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
          inputMode={(isMobile ? "none" : "latin")}
        enterKeyHint="done"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
          className={isTablet ? "absolute opacity-0 w-0 h-0" : "absolute opacity-0 -left-[9999px] w-px h-px"}
        aria-hidden
      />

        <LetterGrid
          rows={rows}
          guesses={guesses}
          lockColors={lockColors}
          stepIdx={stepIdx}
          hardMode={settings.hardMode}
          level={level}
          cursor={cursor}
          onTileClick={(i, col) => {
            setLevel(i);
            setCursor(col);
            if (!isMobile) {
              inputRef.current?.focus();
            }
          }}
          onJumpToRow={(i)=>{
            setLevel(i);
            const firstOpen = nearestUnlockedInRow(i, 0);
            setCursor(firstOpen === -1 ? 0 : firstOpen);
            if (!isMobile) inputRef.current?.focus();
          }}
          referencedRows={referencedRows}
          diffFromRow={dragStartRow}
          diffToRow={dragOverRow}
                  />

        <div className="text-xs text-gray-300 px-3 mt-1 mb-2">{message}</div>
        {/* Spacer equal to keyboard height (updated dynamically) */}
        <div id="bottom-scroll-spacer" className="h-0" aria-hidden />
      </div>

      {/* Sticky keyboard at bottom */}
      <OnScreenKeyboard
        onKeyPress={handleKeyPress}
        onEnter={handleEnter}
        onBackspace={handleBackspace}
        filteredLetters={settings.easyMode ? lettersUsedInAnswers : null}
        onResize={(h) => {
          const spacer = document.getElementById('bottom-scroll-spacer');
          if (spacer) spacer.style.height = Math.max(0, Math.floor(h)) + 'px';
        }}
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
            } catch (_err) { void 0; }
          }}
        />
      )}

      {/* Reveal confirm modal */}
      {showRevealConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-200">
            <div className="text-sm mb-3">Reveal currently selected space?</div>
            <div className="flex justify-end gap-2 text-sm">
              <button
                className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => setShowRevealConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => {
                  revealTileAt(level, cursor);
                  setShowRevealConfirm(false);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={handleCloseHowToPlay} />
      )}
    </div>

    </>
  );
}
