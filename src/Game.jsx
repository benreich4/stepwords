import React, { useEffect, useRef, useState, useMemo } from "react";
import LetterGrid from "./components/LetterGrid.jsx";
import ShareModal from "./components/ShareModal.jsx";
import HowToPlayModal from "./components/HowToPlayModal.jsx";
import OnScreenKeyboard from "./components/OnScreenKeyboard.jsx";
import Toast from "./components/Toast.jsx";
import QuickIntroModal from "./components/QuickIntroModal.jsx";
import { formatDateWithDayOfWeek } from "./lib/date.js";
import { buildEmojiShareGridFrom, computeStepIndices, isPuzzleSolved } from "./lib/gameUtils.js";
// Inline analytics - no separate module needed
export default function Game({ puzzle, isQuick = false, prevId = null, nextId = null }) {
  const rowsRaw = puzzle.rows || [];
  // Normalize answers: ignore spaces in answers (e.g., "hello world" -> "helloworld")
  const rows = useMemo(() => rowsRaw.map(r => ({
    ...r,
    answer: (r?.answer || "").replace(/\s+/g, "")
  })), [rowsRaw]); // [{answer, clue}, ...] shortest→longest
  const stepIdx = computeStepIndices(rows);
  
  // Generate a unique key for this puzzle
  const puzzleNamespace = isQuick ? 'quickstep' : 'stepwords';
  const puzzleKey = `${puzzleNamespace}-${puzzle.id || 'default'}`;
  
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
  const [level, setLevel] = useState(Math.min(savedState.level, Math.max(0, (rows?.length || 1) - 1)));
  const [guesses, setGuesses] = useState(savedState.guesses);
  const [cursor, setCursor] = useState(savedState.cursor);
  const [message, setMessage] = useState("");
  const [enterTipShown, setEnterTipShown] = useState(() => {
    try { return localStorage.getItem('stepwords-enter-tip-shown') === '1'; } catch { return false; }
  });
  const [submitCoachShown, setSubmitCoachShown] = useState(() => {
    try { return localStorage.getItem('stepwords-submit-coach-shown') === '1'; } catch { return false; }
  });
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState("info"); // info | success | warning
  const toastTimerRef = useRef(null);
  const submitBtnRef = useRef(null);
  const starsRef = useRef(null);
  const lastPointsRef = useRef(10);
  const clueBarRef = useRef(null);
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
      return { hardMode: s.hardMode === true, easyMode: s.easyMode === true, lightMode: s.lightMode === true };
    } catch {
      return { hardMode: false, easyMode: false, lightMode: false };
    }
  });
  useEffect(() => {
    try { localStorage.setItem('stepwords-settings', JSON.stringify({ hardMode: settings.hardMode, easyMode: settings.easyMode, lightMode: settings.lightMode })); } catch {}
  }, [settings]);
  const [showSettings, setShowSettings] = useState(false);
  // Easy mode now saved globally in settings (like hardMode)
  // Legacy hint fields kept for save compatibility; now using Lifelines (first/middle/last thirds, vowels)
  const [hintsUsed] = useState(savedState.hintsUsed || { initialLetters: false, stepLetters: false, filterKeyboard: false });
  const [rowsInitialHintUsed] = useState(savedState.rowsInitialHintUsed || rows.map(() => false));
  const [rowsStepHintUsed] = useState(savedState.rowsStepHintUsed || rows.map(() => false));
  // Colors now simplified: 'G' for correct, 'Y' for lifeline-revealed or previously incorrect
  const [wasWrong, setWasWrong] = useState(savedState.wasWrong);
  // Session stats
  const [hintCount, setHintCount] = useState(savedState.hintCount);
  const [guessCount, setGuessCount] = useState(savedState.guessCount);
  const [wrongGuessCount, setWrongGuessCount] = useState(savedState.wrongGuessCount);

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showHintsMenu, setShowHintsMenu] = useState(false);
  const [showQuickIntro, setShowQuickIntro] = useState(false);
  const [gameStartTime] = useState(Date.now());
  const [showLoss, setShowLoss] = useState(false);
  const [stars, setStars] = useState(null);
  const [didFail, setDidFail] = useState(false);
  

  // Function to get letters used in all answers
  const lettersUsedInAnswers = useMemo(() => {
    if (!rows || !rows.length) {
      return [];
    }
    const allLetters = new Set();
    rows.forEach(row => {
      row.answer.toUpperCase().split('').forEach(letter => {
        allLetters.add(letter);
      });
    });
    return Array.from(allLetters).sort();
  }, [rows]);

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
        window.gtag('event', 'hint_used', { hint_type: 'reveal_letter', puzzle_id: puzzle.id || 'unknown', mode: isQuick ? 'quick' : 'main' });
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
    // Quick intro if user has played main but not seen quick intro
    try {
      const hasPlayedMain = localStorage.getItem('stepwords-completed') || localStorage.getItem('stepwords-visited');
      const seenQuickIntro = localStorage.getItem('quickstep-intro-shown');
      if (!isQuick && hasPlayedMain && !seenQuickIntro) {
        setShowQuickIntro(true);
      }
      localStorage.setItem(`${puzzleNamespace}-visited`, '1');
    } catch {}
    
    // If puzzle already completed previously, immediately show share modal
    try {
      const completed = JSON.parse(localStorage.getItem(`${puzzleNamespace}-completed`) || '[]');
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
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main'
        });
      }
    } catch (_err) { void 0; }
  }, [puzzle.id]);

  const handleCloseHowToPlay = () => {
    setShowHowToPlay(false);
    localStorage.setItem('stepwords-how-to-play', 'true');
  };

  // Lifelines (once per puzzle): first/middle/last thirds, vowels
  const [lifelineFirstUsed, setLifelineFirstUsed] = useState(savedState.lifelineFirstUsed || false);
  const [lifelineMiddleUsed, setLifelineMiddleUsed] = useState(savedState.lifelineMiddleUsed || false);
  const [lifelineLastUsed, setLifelineLastUsed] = useState(savedState.lifelineLastUsed || false);
  const [lifelineVowelsUsed, setLifelineVowelsUsed] = useState(savedState.lifelineVowelsUsed || false);

  function revealIndicesInCurrentRow(indices) {
    const i = level;
    const ans = rows[i]?.answer?.toUpperCase?.() || "";
    const len = ans.length;
    if (!len || !Array.isArray(indices) || indices.length === 0) return;
    const newLockColors = lockColors.map(rc => rc.slice());
    const rowLock = newLockColors[i] ? newLockColors[i].slice() : Array(len).fill(null);
    const curChars = (guesses[i] || "").toUpperCase().padEnd(len, " ").slice(0, len).split("");
    for (const c of indices) {
      if (c < 0 || c >= len) continue;
      if (!rowLock[c]) rowLock[c] = "Y";
      curChars[c] = ans[c];
    }
    newLockColors[i] = rowLock;
    const newGuesses = guesses.slice();
    newGuesses[i] = curChars.join("").trimEnd();
    setLockColors(newLockColors);
    setGuesses(newGuesses);
  }

  function useLifeline(kind) {
    const i = level;
    const ans = rows[i]?.answer?.toUpperCase?.() || "";
    const len = ans.length;
    if (!len) return;
    let used = false;
    if (kind === 'first3' && !lifelineFirstUsed) {
      const count = Math.min(isQuick ? 2 : 3, len);
      const idx = Array.from({ length: count }, (_, k) => k);
      revealIndicesInCurrentRow(idx);
      setLifelineFirstUsed(true);
      used = true;
      showToast(`Revealed first ${count} letters.`, 2000, "info");
    } else if (kind === 'edge_step' && !lifelineMiddleUsed) {
      const indices = new Set();
      indices.add(0);
      if (len - 1 >= 0) indices.add(len - 1);
      const sIdx = Array.isArray(stepIdx) ? stepIdx[i] : undefined;
      if (Number.isFinite(sIdx) && sIdx >= 0 && sIdx < len) indices.add(sIdx);
      revealIndicesInCurrentRow(Array.from(indices));
      setLifelineMiddleUsed(true);
      used = true;
      showToast("Revealed first, last, and step letter.", 2200, "info");
    } else if (kind === 'last3' && !lifelineLastUsed) {
      const count = Math.min(isQuick ? 2 : 3, len);
      const start = Math.max(0, len - count);
      const idx = Array.from({ length: count }, (_, k) => start + k);
      revealIndicesInCurrentRow(idx);
      setLifelineLastUsed(true);
      used = true;
      showToast(`Revealed last ${count} letters.`, 2000, "info");
    } else if (kind === 'mid3' && !lifelineVowelsUsed) {
      const count = Math.min(isQuick ? 2 : 3, len);
      const start = Math.max(0, Math.floor((len - count) / 2));
      const idx = Array.from({ length: count }, (_, k) => start + k);
      revealIndicesInCurrentRow(idx);
      setLifelineVowelsUsed(true);
      used = true;
      showToast(`Revealed ${count} middle letters.`, 2000, "info");
    }
    if (used) {
      const before = Math.max(0, scoreBase - (hintCount + wrongGuessCount));
      setHintCount((n) => n + 1);
      setShowHintsMenu(false);
      const after = Math.max(0, scoreBase - (hintCount + 1 + wrongGuessCount));
      if (before > 0 && after === 0) {
        showToast('Score is 0. Next misstep ends the game.', 2800, 'warning');
      }
      try { if (window.gtag && typeof window.gtag==='function') { window.gtag('event','lifeline_used',{ lifeline: kind, puzzle_id: puzzle.id||'unknown', mode: isQuick?'quick':'main' }); } } catch {}
    }
  }

  function revealAllAsYellowAndFill() {
    const newLock = lockColors.map((rowLock, r) => {
      const ans = (rows[r]?.answer || '').toUpperCase();
    const len = ans.length;
      const next = Array(len);
      for (let c = 0; c < len; c++) {
        const cur = rowLock?.[c] || null;
        next[c] = (cur === 'G' || cur === 'Y') ? cur : 'Y';
      }
      return next;
    });
    const newGuesses = rows.map(r => (r.answer || '').toUpperCase());
    setLockColors(newLock);
    setGuesses(newGuesses);
    return { newLock, newGuesses };
  }

  // Save game state to localStorage
  const saveGameState = () => {
    try {
      const stateToSave = {
        lockColors,
        level,
        guesses,
        cursor,
        wasWrong,
        lifelineFirstUsed,
        lifelineMiddleUsed,
        lifelineLastUsed,
        lifelineVowelsUsed,
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


  const clue = rows[level]?.clue || "";
  const scoreBase = 10;
  const usedCount = hintCount + wrongGuessCount;
  const pointsNow = Math.max(0, scoreBase - usedCount);
  const currentStars = pointsNow >= 7 ? 3 : pointsNow >= 4 ? 2 : pointsNow >= 1 ? 1 : 0;
  const nextLossIn = (() => {
    if (currentStars === 0) return 1;
    const rem = 4 - (usedCount % 4);
    return rem === 0 ? 4 : rem;
  })();

  // Clamp level if rows length changes or saved state was out of bounds
  useEffect(() => {
    if (!Array.isArray(rows) || rows.length === 0) { setLevel(0); return; }
    if (level < 0 || level >= rows.length) setLevel(0);
  }, [rows?.length]);

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
    if (!enterTipShown || !submitCoachShown) {
      const after = (next.padEnd(len, " ").slice(0, len)).toUpperCase();
      let full = true;
      for (let col = 0; col < len; col++) {
        if (!isBlocked(level, col) && after[col] === " ") { full = false; break; }
      }
      if (full) {
        if (!enterTipShown) {
          setEnterTipShown(true);
          try { localStorage.setItem('stepwords-enter-tip-shown', '1'); } catch {}
          showToast("Press Enter to submit", 2500, "warning");
        }
        if (!submitCoachShown) {
          setSubmitCoachShown(true);
          try { localStorage.setItem('stepwords-submit-coach-shown', '1'); } catch {}
          // Render a lightweight coachmark anchored near the SUBMIT key
          try {
            const btn = submitBtnRef.current;
            if (btn) {
              const mark = document.createElement('div');
              mark.style.position = 'fixed';
              const r = btn.getBoundingClientRect();
              mark.style.left = Math.max(8, r.left - 6) + 'px';
              mark.style.top = Math.max(8, r.top - 40) + 'px';
              mark.style.zIndex = '9999';
              mark.style.pointerEvents = 'none';
              mark.className = 'px-2 py-1 rounded bg-emerald-700 text-white text-xs border border-emerald-500 shadow';
              mark.textContent = 'Tap Submit to check your row';
              document.body.appendChild(mark);
              setTimeout(() => { try { document.body.removeChild(mark); } catch {} }, 2600);
            } else {
              showToast("Tap Submit to check your row →", 2600, "info");
            }
          } catch {
            showToast("Tap Submit to check your row →", 2600, "info");
          }
        }
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
    let hadWrong = false;

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
        hadWrong = true;
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
    if (hadWrong) setWrongGuessCount((n) => n + 1);
    const scoreBefore = Math.max(0, scoreBase - (hintCount + wrongGuessCount));
    // If already at 0 and we get any new missteps → immediate loss
    if (pointsNow === 0 && hadWrong) {
      const { newLock } = revealAllAsYellowAndFill();
      try { const key = `${puzzleNamespace}-stars`; const map = JSON.parse(localStorage.getItem(key) || '{}'); map[puzzle.id] = 0; localStorage.setItem(key, JSON.stringify(map)); } catch {}
      try { if (window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'puzzle_out_of_score', { puzzle_id: puzzle.id || 'unknown', mode: isQuick ? 'quick' : 'main' }); } } catch {}
      const share = buildEmojiShareGridFrom(rows, newLock);
      setShareText(share);
      setStars(0);
      setDidFail(true);
      setShowShare(true);
      return;
    }

    const newWrongTotal = wrongGuessCount + (hadWrong ? 1 : 0);

    const solvedThisRow = rowColors.every(Boolean);

    // Warn when score reaches 0 (but not loss yet)
    const usedAfter = hintCount + newWrongTotal;
    const pointsAfter = Math.max(0, scoreBase - usedAfter);
    const starsAfter = pointsAfter >= 7 ? 3 : pointsAfter >= 4 ? 2 : pointsAfter >= 1 ? 1 : 0;
    if (starsAfter === 0 && pointsAfter === 0) {
      // show coachmark warning only when reaching 0 stars
      showToast('Next misstep loses the game!', 3000, 'warning');
      try {
        const el = starsRef.current;
        if (el) {
          el.classList.add('ring-2','ring-red-500');
          setTimeout(() => { try { el.classList.remove('ring-2','ring-red-500'); } catch {} }, 1500);
          // Coachmark near stars
          const r = el.getBoundingClientRect();
          const mark = document.createElement('div');
          mark.style.position = 'fixed';
          mark.style.left = Math.max(8, r.right + 8) + 'px';
          mark.style.top = Math.max(8, r.top - 4) + 'px';
          mark.style.zIndex = '9999';
          mark.style.pointerEvents = 'none';
          mark.className = 'px-2 py-1 rounded bg-red-700 text-white text-xs border border-red-500 shadow';
          mark.textContent = 'Next misstep loses the game!';
          document.body.appendChild(mark);
          setTimeout(() => { try { document.body.removeChild(mark); } catch {} }, 2600);
        }
      } catch {}
    }

    if (solvedThisRow) {
      // ✅ Only consider the puzzle solved if *every* row is fully colored
      if (isPuzzleSolved(colorsAfter, rows)) {
        setLockColors(colorsAfter);

        showToast("🎉 You solved all the Stepwords!", 2800, "success");
        const share = buildEmojiShareGridFrom(rows, colorsAfter);
        setShareText(share);
        // Compute and persist stars from final score
        const finalScore = Math.max(0, scoreBase - (hintCount + newWrongTotal));
        const awarded = finalScore >= 7 ? 3 : (finalScore >= 4 ? 2 : (finalScore >= 1 ? 1 : 0));
        setStars(awarded);
        setDidFail(false);
        try {
          const key = `${puzzleNamespace}-stars`;
          const map = JSON.parse(localStorage.getItem(key) || '{}');
          map[puzzle.id] = awarded;
          localStorage.setItem(key, JSON.stringify(map));
        } catch {}
        // Record perfect (score 10 and no lifelines used)
        try {
          if (finalScore === 10 && hintCount === 0) {
            const pkey = `${puzzleNamespace}-perfect`;
            const arr = JSON.parse(localStorage.getItem(pkey) || '[]');
            if (!arr.includes(puzzle.id)) {
              arr.push(puzzle.id);
              localStorage.setItem(pkey, JSON.stringify(arr));
            }
          }
        } catch {}
        setShowShare(true);
        
        // Track game completion
        try {
          if (window.gtag && typeof window.gtag === 'function') {
            window.gtag('event', 'game_completed', {
              puzzle_id: puzzle.id || 'unknown',
              hints_used: hintCount,
              total_guesses: guessCount,
              wrong_guesses: wrongGuessCount,
              completion_time: Date.now() - (gameStartTime || Date.now()),
              mode: isQuick ? 'quick' : 'main'
            });
          }
        } catch (_err) { void 0; }
        
        // Clear saved state when puzzle is completed
        localStorage.removeItem(puzzleKey);
        
        // Mark puzzle as completed
        const completedPuzzles = JSON.parse(localStorage.getItem(`${puzzleNamespace}-completed`) || '[]');
        if (!completedPuzzles.includes(puzzle.id)) {
          completedPuzzles.push(puzzle.id);
          localStorage.setItem(`${puzzleNamespace}-completed`, JSON.stringify(completedPuzzles));
        }

        // Perfect tracking no longer needed (covered by 3-star score)
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
  // Inhibit this toast when at 0 points so the loss-warning toast is visible
  if (!(pointsAfter === 0)) {
    showToast("Kept correct letters. Try filling the rest.", 2400, "warning");
  }
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

  // One-time coachmark to highlight the clue bar for first-time players
  // Show only after the How To modal has been closed the first time
  useEffect(() => {
    try {
      if (showHowToPlay) return; // wait until How To is closed
      if (localStorage.getItem('stepwords-clue-coach-shown') === '1') return;
      const t = setTimeout(() => {
        const el = clueBarRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mark = document.createElement('div');
        mark.style.position = 'fixed';
        // Center horizontally over the clue bar
        mark.style.left = (r.left + r.width / 2) + 'px';
        mark.style.transform = 'translateX(-50%)';
        mark.style.top = Math.max(8, r.top - 28) + 'px';
        mark.style.zIndex = '9999';
        mark.style.pointerEvents = 'none';
        mark.className = 'px-2 py-1 rounded bg-sky-700 text-white text-xs border border-sky-500 shadow';
        mark.textContent = 'Your clue is here';
        document.body.appendChild(mark);
        setTimeout(() => { try { document.body.removeChild(mark); } catch {} }, 2600);
        localStorage.setItem('stepwords-clue-coach-shown', '1');
      }, 400);
      return () => clearTimeout(t);
    } catch {}
  }, [showHowToPlay]);

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
    // If current tile is blocked (solved/hinted), act on the nearest editable to the left
    if (isBlocked(level, cursor)) {
      let left = cursor - 1;
      while (left >= 0 && isBlocked(level, left)) left--;
      if (left >= 0) {
        // Delete the letter at the immediate editable left (if any) and move cursor there
        const chLeft = cur[left];
        const updated = cur.slice(0, left) + " " + cur.slice(left + 1);
        setGuessAt(level, updated.trimEnd());
        setCursor(left);
      }
      return;
    }

    // Editable tile behavior
    const here = cur[cursor];
    if (here !== " ") {
      // If current tile has a letter: delete it but keep cursor in place
      const updated = cur.slice(0, cursor) + " " + cur.slice(cursor + 1);
      setGuessAt(level, updated.trimEnd());
      setCursor(cursor);
      return;
    }

    // Current tile is empty → delete the immediate letter to the left (skipping blocked), and move cursor left
    let left = cursor - 1;
    while (left >= 0 && isBlocked(level, left)) left--;
    if (left >= 0) {
      const updated = cur.slice(0, left) + " " + cur.slice(left + 1);
      setGuessAt(level, updated.trimEnd());
      setCursor(left);
    }
  };

  // Treat both real locks and hint-reveals as "blocked"
  function isBlocked(rowIndex, colIndex) {
    return isLocked(rowIndex, colIndex);
  }



  return (
    <>
    <div className={`w-screen h-[105vh] bg-black flex flex-col ${settings.lightMode ? 'filter invert hue-rotate-180' : ''}`}>
      <div className="px-3 text-center pt-4">
        {/* Smaller date on mobile */}
        {puzzle.date && (
          <div className="text-sm sm:text-lg md:text-xl font-bold text-gray-100 mb-1 flex items-center justify-center gap-3">
            {prevId && (
              <a href={`/${isQuick ? 'quick/' : ''}${prevId}`} className="px-2 py-1 rounded hover:bg-gray-800" aria-label="Previous puzzle">←</a>
            )}
            <span>{formatDateWithDayOfWeek(puzzle.date)}</span>
            {nextId && (
              <a href={`/${isQuick ? 'quick/' : ''}${nextId}`} className="px-2 py-1 rounded hover:bg-gray-800" aria-label="Next puzzle">→</a>
            )}
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
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <div
            ref={starsRef}
            className="px-2 py-0.5 rounded border border-gray-700 bg-gray-900/40 flex items-center gap-0.5 cursor-pointer"
            title="Current stars"
            role="button"
            tabIndex={0}
            onClick={() => showToast(`Lose a star for every 4 missteps or lifelines used. Next star lost in ${nextLossIn} missteps or lifelines used.`, 5200, 'info')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showToast(`Lose a star for every 4 missteps or lifelines used. Next star lost in ${nextLossIn} missteps or lifelines used.`, 5200, 'info'); } }}
          >
            <span className={currentStars >= 1 ? 'text-yellow-300' : 'text-gray-500'}>★</span>
            <span className={currentStars >= 2 ? 'text-yellow-300' : 'text-gray-500'}>★</span>
            <span className={currentStars >= 3 ? 'text-yellow-300' : 'text-gray-500'}>★</span>
        </div>
          {pointsNow === 0 && (
            <div className="px-2 py-0.5 rounded border border-red-600 bg-red-900/40 text-red-300">
              Next misstep loses the game!
      </div>
          )}
        <button
            className="px-2 py-0.5 inline-flex items-center justify-center rounded border border-gray-700 text-gray-300 hover:bg-gray-900/60 text-xs"
            aria-label="How do stars work?"
            onClick={() => showToast(`Lose a star for every 4 missteps or lifelines used. Next star lost in ${nextLossIn} ${nextLossIn === 1 ? 'misstep or lifeline used' : 'missteps or lifelines used'}.`, 5200, 'info')}
          >?
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowHintsMenu((v)=>!v)}
              className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
            >
              Lifelines
            </button>
            {showHintsMenu && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-gray-800 border border-gray-600 rounded-md shadow-lg p-1 text-xs">
                <button className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded disabled:opacity-40" disabled={lifelineMiddleUsed} onClick={()=>useLifeline('edge_step')}>Reveal first, last, and step letter</button>
                <button className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded disabled:opacity-40" disabled={lifelineFirstUsed} onClick={()=>useLifeline('first3')}>Reveal first {isQuick ? 2 : 3} letters</button>
                <button className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded disabled:opacity-40" disabled={lifelineVowelsUsed} onClick={()=>useLifeline('mid3')}>Reveal {isQuick ? 2 : 3} middle letters</button>
                <button className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded disabled:opacity-40" disabled={lifelineLastUsed} onClick={()=>useLifeline('last3')}>Reveal last {isQuick ? 2 : 3} letters</button>
              </div>
            )}
          </div>
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
                  <span className="text-gray-300">Light mode</span>
                  <button
                    role="switch"
                    aria-checked={settings.lightMode ? "true" : "false"}
                    onClick={() => {
                      const checked = !settings.lightMode;
                      setSettings(s => ({ ...s, lightMode: checked }));
                      try {
                        if (window.gtag && typeof window.gtag === 'function') {
                          window.gtag('event', checked ? 'light_mode_turned_on' : 'light_mode_turned_off', { puzzle_id: puzzle.id || 'unknown' });
                        }
                      } catch {}
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.lightMode ? 'bg-sky-500' : 'bg-gray-600'}`}
                    aria-label="Toggle light mode"
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.lightMode ? 'translate-x-4' : 'translate-x-1'}`}></span>
        </button>
                </label>
                <div className="text-[10px] text-gray-400 mb-2">Invert colors for a light appearance.</div>
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

      <div ref={clueBarRef} className="w-full px-3 py-2 sticky top-[48px] bg-black/80 backdrop-blur border-b border-gray-800 z-10">
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
          inputMode={"none"}
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
        submitReady={(() => {
          const len = rowLen(level);
          const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
          for (let col = 0; col < len; col++) {
            if (!isBlocked(level, col) && cur[col] === " ") return false;
          }
          return true;
        })()}
        onResize={(h) => {
          const spacer = document.getElementById('bottom-scroll-spacer');
          if (spacer) spacer.style.height = Math.max(0, Math.floor(h)) + 'px';
        }}
        submitButtonRef={submitBtnRef}
      />
   
      {showShare && (
        <ShareModal
          shareText={shareText}
          hintCount={hintCount}
          wrongGuessCount={wrongGuessCount}
          guessCount={guessCount}
          rowsLength={rows.length}
          isQuick={isQuick}
          stars={stars}
          didFail={didFail}
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
      {showQuickIntro && (
        <QuickIntroModal onClose={() => { setShowQuickIntro(false); try { localStorage.setItem('quickstep-intro-shown','1'); } catch {} }} />
      )}
      {showLoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-200">
            <div className="text-lg font-semibold mb-2">Out of missteps</div>
            <div className="text-sm mb-4">You ran out of missteps. Better luck tomorrow!</div>
            <div className="flex justify-end gap-2 text-sm">
              <button
                className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => setShowLoss(false)}
              >Close</button>
              <a
                href="/archives"
                className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700"
                onClick={(e) => {
                  try { e.preventDefault(); window.history.pushState({}, "", "/archives"); } catch {}
                  setShowLoss(false);
                }}
              >Go to Archives</a>
    </div>
          </div>
        </div>
      )}
    </div>

    </>
  );
}
