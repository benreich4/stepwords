import React, { useEffect, useRef, useState, useMemo } from "react";
import LetterGrid from "./components/LetterGrid.jsx";
import ShareModal from "./components/ShareModal.jsx";
import HowToPlayModal from "./components/HowToPlayModal.jsx";
import OnScreenKeyboard from "./components/OnScreenKeyboard.jsx";
import Toast from "./components/Toast.jsx";
import QuickIntroModal from "./components/QuickIntroModal.jsx";
import { formatDateWithDayOfWeek, getTodayIsoInET } from "./lib/date.js";
import { buildEmojiShareGridFrom, computeStepIndices, isPuzzleSolved } from "./lib/gameUtils.js";
import { useLifelines, LifelineMenu } from "./lib/lifelines.jsx";
import { useReveal, RevealConfirmModal } from "./lib/reveal.jsx";
import { usePuzzleTimer } from "./lib/timer.js";
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
  
  // Check if user is experienced (3+ main puzzles completed)
  const isExperienced = useMemo(() => {
    try {
      const completed = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
      return completed.length >= 3;
    } catch {
      return false;
    }
  }, []);
  
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
          lifelineLevel: parsed.lifelineLevel || 0,
          lifelinesUsed: parsed.lifelinesUsed || {
            first3: false,
            last3: false,
            middle3: false,
            firstLastStep: false
          },
          wordRevealed: parsed.wordRevealed || false,
          elapsedMs: Number.isFinite(parsed.elapsedMs) ? parsed.elapsedMs : 0,
          timerFinished: parsed.timerFinished === true,
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
      lifelineLevel: 0,
      lifelinesUsed: {
        first3: false,
        last3: false,
        middle3: false,
        firstLastStep: false
      },
      wordRevealed: false,
      elapsedMs: 0,
      timerFinished: false,
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
  // Minimal: refs to detect outside clicks for popovers
  const settingsRef = useRef(null);
  const lifelineRef = useRef(null);
  const submitBtnRef = useRef(null);
  const collapseBtnRef = useRef(null);
  const starsRef = useRef(null);
  const lastPointsRef = useRef(10);
  const clueBarRef = useRef(null);
  const [dragStartRow, setDragStartRow] = useState(null);
  const [dragOverRow, setDragOverRow] = useState(null);
  const [diffTipShown, setDiffTipShown] = useState(() => {
    try { return localStorage.getItem('stepwords-diff-tip-shown') === '1'; } catch { return false; }
  });
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('stepwords-header-collapsed') === '1'; } catch { return false; }
  });

  // Determine if this puzzle was already completed or failed before timer fields existed
  // const hideTimerDueToLegacy = useMemo(() => shouldHideTimerForLegacy(puzzleNamespace, puzzle.id, savedState.hadTimerFields), [puzzleNamespace, puzzle.id, savedState.hadTimerFields]);

  // Sync header collapse state with global header toggle (from App header button)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'stepwords-header-collapsed') {
        try { setHeaderCollapsed(localStorage.getItem('stepwords-header-collapsed') === '1'); } catch {}
      }
    };
    const onCustom = () => {
      try { setHeaderCollapsed(localStorage.getItem('stepwords-header-collapsed') === '1'); } catch {}
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('stepwords-header-toggle', onCustom);
    return () => { window.removeEventListener('storage', onStorage); document.removeEventListener('stepwords-header-toggle', onCustom); };
  }, []);
  const lastActivityRef = useRef(Date.now());
  // Track progress (typing, locking, submits) to nudge jumping ahead
  const lastProgressRef = useRef(Date.now());
  const jumpNudgeShownRef = useRef(false);
  const [kbCollapsed, setKbCollapsed] = useState(() => {
    try { return localStorage.getItem('stepwords-kb-collapsed') === '1'; } catch { return false; }
  });

  // If this puzzle was previously lost (stars persisted as 0), reflect that in the banner
  useEffect(() => {
    try {
      const key = `${puzzleNamespace}-stars`;
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      if (map && Object.prototype.hasOwnProperty.call(map, puzzle.id) && map[puzzle.id] === 0) {
        setDidFail(true);
      }
    } catch {}
  }, [puzzleNamespace, puzzle.id]);

  function showToast(text, durationMs = 4000, variant = "info") {
    setToast(text || "");
    setToastVariant(variant || "info");
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (text) {
      const effectiveDuration = Math.max(Number.isFinite(durationMs) ? durationMs : 0, 4000);
      toastTimerRef.current = setTimeout(() => {
        setToast("");
        toastTimerRef.current = null;
      }, effectiveDuration);
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
  const rowInputRefs = useRef([]);
  const [ime, setIme] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
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
  // Legacy hint fields kept for save compatibility
  const [hintsUsed] = useState(savedState.hintsUsed || { initialLetters: false, stepLetters: false, filterKeyboard: false });
  const [rowsInitialHintUsed] = useState(savedState.rowsInitialHintUsed || rows.map(() => false));
  const [rowsStepHintUsed] = useState(savedState.rowsStepHintUsed || rows.map(() => false));
  // Colors now simplified: 'G' for correct, 'Y' for hint-revealed or previously incorrect
  const [wasWrong, setWasWrong] = useState(savedState.wasWrong);
  // Session stats
  const [hintCount, setHintCount] = useState(savedState.hintCount);
  const [guessCount, setGuessCount] = useState(savedState.guessCount);
  const [wrongGuessCount, setWrongGuessCount] = useState(savedState.wrongGuessCount);

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showQuickIntro, setShowQuickIntro] = useState(false);
  const [gameStartTime] = useState(Date.now());
  const [showLoss, setShowLoss] = useState(false);
  const [stars, setStars] = useState(null);
  const [didFail, setDidFail] = useState(false);
  // Timer via hook
  const { elapsedMs, running: timerRunning, finished: timerFinished, start: startTimer, pause: pauseTimer, stop: stopTimer, format: formatElapsed } = usePuzzleTimer(savedState.elapsedMs || 0, savedState.timerFinished || false);

  // Pause/resume on visibility change (after timer hook is ready)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pauseTimer(); else if (!timerFinished) startTimer();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [timerFinished]);

  // Stop timer when puzzle finished or failed
  useEffect(() => {
    if (showShare || didFail) stopTimer();
  }, [showShare, didFail]);

  // Lifeline state
  const [showLifelineMenu, setShowLifelineMenu] = useState(false);
  const [lifelineLevel, setLifelineLevel] = useState(savedState.lifelineLevel || 0);
  const [lifelinesUsed, setLifelinesUsed] = useState(savedState.lifelinesUsed || {
    first3: false,
    last3: false,
    middle3: false,
    firstLastStep: false
  });
  
  // Reveal state
  const [wordRevealed, setWordRevealed] = useState(savedState.wordRevealed || false);
  
  // Lifeline functionality
  const { generatePrefixData, showPrefixes, extendPrefixes, canExtend } = useLifelines(
    rows, 
    lockColors, 
    lifelineLevel, 
    setLifelineLevel, 
    setHintCount, 
    (message, duration, variant) => {
      setToast(message);
      setToastVariant(variant);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(""), duration || 2000);
    },
    puzzle,
    isQuick
  );
  
  function revealSpecificIndices(indices) {
    if (!Array.isArray(indices) || indices.length === 0) return;
    // Act on current level
    const i = level;
    const ans = rows[i]?.answer?.toUpperCase?.() || "";
    const len = ans.length;
    const valid = indices.filter((c) => Number.isFinite(c) && c >= 0 && c < len);
    if (!valid.length) return;
    const newLockColors = lockColors.map((rc) => rc.slice());
    const rowLock = newLockColors[i] ? newLockColors[i].slice() : Array(len).fill(null);
    const curChars = (guesses[i] || "").toUpperCase().padEnd(len, " ").slice(0, len).split("");
    valid.forEach((c) => { if (!rowLock[c]) rowLock[c] = "Y"; curChars[c] = ans[c]; });
    newLockColors[i] = rowLock;
    const newGuesses = guesses.slice();
    newGuesses[i] = curChars.join("").trimEnd();
    setLockColors(newLockColors);
    setGuesses(newGuesses);
    setHintCount((n) => n + 2); // costs 2 missteps
    showToast("Revealed letters.", 2000, "info");
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'hint_used', { hint_type: 'lifeline_reveal', puzzle_id: puzzle.id || 'unknown', mode: isQuick ? 'quick' : 'main' });
      }
    } catch {}
  }

  const handleRevealFirst3 = () => {
    if (lifelinesUsed.first3) return;
    const i = level; const len = rows[i]?.answer?.length || 0;
    const numLetters = isQuick ? 2 : 3;
    const idx = Array.from({length: numLetters}, (_, k) => k).filter(c=>c < len);
    revealSpecificIndices(idx);
    setLifelinesUsed(prev => ({ ...prev, first3: true }));
    
    // Track lifeline usage
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'lifeline_used', {
          lifeline_type: isQuick ? 'first2' : 'first3',
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main'
        });
      }
    } catch {}
  };
  const handleRevealLast3 = () => {
    if (lifelinesUsed.last3) return;
    const i = level; const len = rows[i]?.answer?.length || 0;
    const numLetters = isQuick ? 2 : 3;
    const start = Math.max(0, len - numLetters);
    const idx = Array.from({length: Math.min(numLetters, len)}, (_,k)=> start + k);
    revealSpecificIndices(idx);
    setLifelinesUsed(prev => ({ ...prev, last3: true }));
    
    // Track lifeline usage
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'lifeline_used', {
          lifeline_type: isQuick ? 'last2' : 'last3',
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main'
        });
      }
    } catch {}
  };
  const handleRevealMiddle3 = () => {
    if (lifelinesUsed.middle3) return;
    const i = level; const len = rows[i]?.answer?.length || 0;
    if (len === 0) return;
    const numLetters = isQuick ? 2 : 3;
    
    if (len <= numLetters) { 
      revealSpecificIndices(Array.from({length: len}, (_,k)=>k)); 
      setLifelinesUsed(prev => ({ ...prev, middle3: true }));
      
      // Track lifeline usage
      try {
        if (window.gtag && typeof window.gtag === 'function') {
          window.gtag('event', 'hint_used', {
            hint_type: isQuick ? 'lifeline_middle2' : 'lifeline_middle3',
            puzzle_id: puzzle.id || 'unknown',
            mode: isQuick ? 'quick' : 'main'
          });
        }
      } catch {}
      return; 
    }
    
    const mid = Math.floor(len/2);
    let idx;
    if (isQuick) {
      // For quick: middle 2 letters
      idx = len % 2 === 1 ? [mid-1, mid] : [mid-1, mid];
    } else {
      // For main: middle 3 letters
      idx = len % 2 === 1 ? [mid-1, mid, mid+1] : [mid-2, mid-1, mid];
    }
    const valid = idx.filter(c=> c>=0 && c<len);
    revealSpecificIndices(valid);
    setLifelinesUsed(prev => ({ ...prev, middle3: true }));
    
    // Track lifeline usage
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'lifeline_used', {
          lifeline_type: isQuick ? 'middle2' : 'middle3',
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main'
        });
      }
    } catch {}
  };
  const handleRevealFirstLastStep = () => {
    if (lifelinesUsed.firstLastStep) return;
    const i = level; const len = rows[i]?.answer?.length || 0;
    if (len === 0) return;
    const first = 0; const last = len - 1;
    const step = stepIdx?.[i] ?? -1;
    
    let idx;
    if (isQuick) {
      // For quick: first and last letters only (no step)
      idx = [first, last];
    } else {
      // For main: first, last, and step letters
      idx = [first, last, ...(step>=0 ? [step] : [])];
    }
    const uniq = Array.from(new Set(idx)).filter(c=> c>=0 && c<len);
    revealSpecificIndices(uniq);
    setLifelinesUsed(prev => ({ ...prev, firstLastStep: true }));
    
    // Track lifeline usage
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'lifeline_used', {
          lifeline_type: isQuick ? 'first_last' : 'first_last_step',
          puzzle_id: puzzle.id || 'unknown',
          mode: isQuick ? 'quick' : 'main'
        });
      }
    } catch {}
  };


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
    setHintCount((n) => n + 2);
    showToast("Revealed letter.", 2000, "info");
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'reveal_used', { reveal_type: 'letter', puzzle_id: puzzle.id || 'unknown', mode: isQuick ? 'quick' : 'main' });
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
      setIsIOS(/iPad|iPhone|iPod/i.test(ua));
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
    // Quick intro only if user has solved a Main before but has not solved any Quick yet, and hasn't seen this intro
    try {
      const mainCompleted = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
      const quickCompleted = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
      const seenQuickIntro = localStorage.getItem('quickstep-intro-shown');
      if (!isQuick && Array.isArray(mainCompleted) && mainCompleted.length > 0 && Array.isArray(quickCompleted) && quickCompleted.length === 0 && !seenQuickIntro) {
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

  const showStarsInfo = () => {
    showToast(`Lose a star for every 4 missteps. Next star lost in ${nextLossIn} ${nextLossIn === 1 ? 'misstep' : 'missteps'}.`, 5200, 'info');
  };


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
        hintCount,
        guessCount,
        wrongGuessCount,
        lifelineLevel,
        lifelinesUsed,
        wordRevealed,
        elapsedMs,
        timerFinished,
      };
      localStorage.setItem(puzzleKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  };

  // Save state whenever it changes
  useEffect(() => {
    saveGameState();
  }, [lockColors, level, guesses, cursor, wasWrong, hintCount, guessCount, wrongGuessCount, lifelineLevel, lifelinesUsed, wordRevealed, elapsedMs, timerFinished]);

  const clue = rows[level]?.clue || "";
  const scoreBase = 10;
  const usedCount = hintCount + wrongGuessCount;
  
  // Reveal functionality
  const { showWordRevealConfirm, setShowWordRevealConfirm, revealCurrentWord } = useReveal(
    rows,
    guesses,
    setGuesses,
    lockColors,
    setLockColors,
    level,
    (message, duration, variant) => {
      setToast(message);
      setToastVariant(variant);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(""), duration || 2000);
    },
    wordRevealed,
    setWordRevealed,
    isPuzzleSolved,
    buildEmojiShareGridFrom,
    setShareText,
    setStars,
    setDidFail,
    setShowShare,
    hintCount,
    wrongGuessCount,
    scoreBase,
    puzzleNamespace,
    puzzle,
    isQuick,
    elapsedMs,
    formatElapsed(elapsedMs)
  );
  
  const pointsNow = Math.max(0, scoreBase - usedCount);
  const currentStars = wordRevealed ? 0 : (pointsNow >= 7 ? 3 : pointsNow >= 4 ? 2 : pointsNow >= 1 ? 1 : 0);
  const nextLossIn = (() => {
    if (currentStars === 0) return 1;
    const rem = 4 - (usedCount % 4);
    return rem === 0 ? 4 : rem;
  })();

  const hideZeroTime = timerFinished && elapsedMs < 1000;

  // Consider puzzle solved if all rows are fully colored
  const solvedNow = useMemo(() => isPuzzleSolved(lockColors, rows), [lockColors, rows]);

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
            className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[9px] leading-none align-middle -translate-y-[1px] ${settings.lightMode ? 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200' : 'bg-yellow-700/30 border-yellow-400 text-yellow-200 hover:bg-yellow-700/40'}`}
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
    try { lastActivityRef.current = Date.now(); } catch {}
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
    const starsAfter = wordRevealed ? 0 : (pointsAfter >= 7 ? 3 : pointsAfter >= 4 ? 2 : pointsAfter >= 1 ? 1 : 0);
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
        const awarded = wordRevealed ? 0 : (finalScore >= 7 ? 3 : (finalScore >= 4 ? 2 : (finalScore >= 1 ? 1 : 0)));
        setStars(awarded);
        setDidFail(false);
        try {
          const key = `${puzzleNamespace}-stars`;
          const map = JSON.parse(localStorage.getItem(key) || '{}');
          map[puzzle.id] = awarded;
          localStorage.setItem(key, JSON.stringify(map));
        } catch {}
        // Save completion time
        try {
          const tkey = `${puzzleNamespace}-times`;
          const tmap = JSON.parse(localStorage.getItem(tkey) || '{}');
          tmap[puzzle.id] = elapsedMs;
          localStorage.setItem(tkey, JSON.stringify(tmap));
        } catch {}
        // Record perfect (score 10 and no hints used)
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
              mode: isQuick ? 'quick' : 'main',
              solve_time_ms: elapsedMs,
              solve_time_display: formatElapsed(elapsedMs),
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


  // Progress-based nudge: after 15s without progress, suggest jumping ahead
  useEffect(() => {
    if (isExperienced) return; // Skip skip-ahead toast for experienced users
    const id = setInterval(() => {
      try {
        if (jumpNudgeShownRef.current) return;
        if (showHowToPlay || showSettings || showQuickIntro || showShare) return;
        if (solvedNow || didFail) return;
        const idleMs = Date.now() - (lastProgressRef.current || 0);
        if (idleMs >= 15000) {
          showToast("Stuck? Try jumping ahead to another word!", 2800, "info");
          jumpNudgeShownRef.current = true;
        }
      } catch {}
    }, 3000);
    return () => { clearInterval(id); };
  }, [isExperienced, showHowToPlay, showSettings, showQuickIntro, showShare, solvedNow, didFail]);

  // Reset progress timer and allow showing the nudge again when there is progress
  useEffect(() => {
    try {
      lastProgressRef.current = Date.now();
      jumpNudgeShownRef.current = false;
    } catch {}
  }, [guesses, lockColors, hintCount, wrongGuessCount]);

  // Close lifeline menu when settings are opened
  useEffect(() => {
    if (showSettings) {
      setShowLifelineMenu(false);
    }
  }, [showSettings]);

  // Minimal: close Settings when clicking/tapping outside
  useEffect(() => {
    const handler = (e) => {
      try {
        if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target)) {
          setShowSettings(false);
        }
      } catch {}
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [showSettings]);

  // Close Lifeline (Hints) menu when clicking/tapping outside
  useEffect(() => {
    const handler = (e) => {
      try {
        if (showLifelineMenu && lifelineRef.current && !lifelineRef.current.contains(e.target)) {
          setShowLifelineMenu(false);
        }
      } catch {}
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [showLifelineMenu]);

  // One-time coachmark to highlight the clue bar for first-time players
  // Show only after the How To modal has been closed the first time
  useEffect(() => {
    if (isExperienced) return; // Skip coachmarks for experienced users
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
  }, [isExperienced, showHowToPlay]);

  // One-time coachmark to highlight the Hints button after 60s (for new players)
  useEffect(() => {
    if (isExperienced) return; // Skip coachmarks for experienced users
    try {
      if (localStorage.getItem('stepwords-hints-coach-shown') === '1') return;
      const t = setTimeout(() => {
        if (showHowToPlay || showSettings || showQuickIntro || showShare) return;
        if (solvedNow || didFail) return;
        if (hintCount > 0) return; // Already used hints
        const el = lifelineRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mark = document.createElement('div');
        mark.style.position = 'fixed';
        // Center horizontally over the Hints button
        mark.style.left = (r.left + r.width / 2) + 'px';
        mark.style.transform = 'translateX(-50%)';
        // Place just above the lightbulb icon
        mark.style.top = Math.max(8, r.top - 30) + 'px';
        mark.style.zIndex = '9999';
        mark.style.pointerEvents = 'none';
        mark.className = 'px-2 py-1 rounded bg-sky-700 text-white text-xs border border-sky-500 shadow';
        // Force single-line coachmark
        mark.style.whiteSpace = 'nowrap';
        mark.style.maxWidth = 'none';
        mark.textContent = 'Stuck? Try a hint!';
        document.body.appendChild(mark);
        setTimeout(() => { try { document.body.removeChild(mark); } catch {} }, 2600);
        localStorage.setItem('stepwords-hints-coach-shown', '1');
      }, 60000);
      return () => clearTimeout(t);
    } catch {}
  }, [isExperienced, showHowToPlay, showSettings, showQuickIntro, showShare, solvedNow, didFail, hintCount]);

  // On-screen keyboard handlers (mobile)
  const handleKeyPress = (key) => {
    typeChar(key);
  };

  // Auto-submit all rows when the entire grid is filled and every letter is correct
  const autoSubmitDoneRef = useRef(false);
  useEffect(() => {
    if (autoSubmitDoneRef.current) return;
    try {
      if (!rows || !rows.length) return;
      // If already solved/showing share, skip
      if (showShare) return;
      // Only auto-submit if the player hasn't manually submitted any row yet
      if (guessCount > 0) return;
      // Check all rows fully filled and exactly match answers
      const allCorrect = rows.every((row, i) => {
        const ans = (row?.answer || "").toUpperCase();
        if (!ans) return false;
        const len = ans.length;
        const guess = ((guesses[i] || "").toUpperCase()).padEnd(len, " ").slice(0, len);
        if (guess.includes(" ")) return false; // not fully filled
        return guess === ans;
      });
      if (!allCorrect) return;

      // Lock all rows as solved in one shot
      const newLock = rows.map((row) => Array.from({ length: (row?.answer || "").length }, () => 'G'));
      setLockColors(newLock);
      setGuesses(rows.map((r) => (r?.answer || "").toUpperCase()));

      // Compute final score and stars (no extra missteps added)
      const finalScore = Math.max(0, scoreBase - (hintCount + wrongGuessCount));
      const awarded = wordRevealed ? 0 : (finalScore >= 7 ? 3 : (finalScore >= 4 ? 2 : (finalScore >= 1 ? 1 : 0)));
      setStars(awarded);
      setDidFail(false);
      try {
        const key = `${puzzleNamespace}-stars`;
        const map = JSON.parse(localStorage.getItem(key) || '{}');
        map[puzzle.id] = awarded;
        localStorage.setItem(key, JSON.stringify(map));
      } catch {}
      // Save completion time
      try {
        const tkey = `${puzzleNamespace}-times`;
        const tmap = JSON.parse(localStorage.getItem(tkey) || '{}');
        tmap[puzzle.id] = elapsedMs;
        localStorage.setItem(tkey, JSON.stringify(tmap));
      } catch {}

      // Perfect tracking
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

      // Build share text and show modal
      try {
        const share = buildEmojiShareGridFrom(rows, newLock);
        setShareText(share);
      } catch {}
      setShowShare(true);

      // Analytics
      try {
        if (window.gtag && typeof window.gtag === 'function') {
          window.gtag('event', 'game_completed', {
            puzzle_id: puzzle.id || 'unknown',
            hints_used: hintCount,
            total_guesses: guessCount,
            wrong_guesses: wrongGuessCount,
            completion_time: Date.now() - (gameStartTime || Date.now()),
            mode: isQuick ? 'quick' : 'main',
            solve_time_ms: elapsedMs,
            solve_time_display: formatElapsed(elapsedMs),
          });
        }
      } catch {}

      // Clear saved state and mark completed
      try { localStorage.removeItem(puzzleKey); } catch {}
      try {
        const completedPuzzles = JSON.parse(localStorage.getItem(`${puzzleNamespace}-completed`) || '[]');
        if (!completedPuzzles.includes(puzzle.id)) {
          completedPuzzles.push(puzzle.id);
          localStorage.setItem(`${puzzleNamespace}-completed`, JSON.stringify(completedPuzzles));
        }
      } catch {}

      autoSubmitDoneRef.current = true;
    } catch {}
  }, [guesses, rows, hintCount, wrongGuessCount, guessCount, wordRevealed, isQuick, puzzle.id, puzzleNamespace, scoreBase, elapsedMs, formatElapsed, showShare, gameStartTime]);

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
    <div className={`w-screen h-[105vh] flex flex-col ${settings.lightMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
      <div className={`px-3 text-center transition-all duration-300 ease-out ${headerCollapsed ? 'h-0 overflow-hidden p-0 m-0 opacity-0' : 'pt-1 opacity-100'}`}>
        {!headerCollapsed && (
        <>
        {puzzle.date && (
          <div className={`text-sm sm:text-lg md:text-xl font-bold mb-0.5 flex items-center justify-center gap-3 ${settings.lightMode ? 'text-gray-900' : 'text-gray-100'}`}>
            {prevId && (
              <a href={`/${isQuick ? 'quick/' : ''}${prevId}`} className={`px-2 py-1 rounded ${settings.lightMode ? 'hover:bg-gray-200' : 'hover:bg-gray-800'}`} aria-label="Previous puzzle">←</a>
            )}
            <span>{formatDateWithDayOfWeek(puzzle.date)}</span>
            {nextId && (
              <a href={`/${isQuick ? 'quick/' : ''}${nextId}`} className={`px-2 py-1 rounded ${settings.lightMode ? 'hover:bg-gray-200' : 'hover:bg-gray-800'}`} aria-label="Next puzzle">→</a>
            )}
          </div>
        )}
        {puzzle.author && (
          <div className={`text-xs sm:text-sm mb-1 ${settings.lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
            By {puzzle.author}
          </div>
        )}
        <div className={`text-xs sm:text-base italic mb-1 ${settings.lightMode ? 'text-gray-700' : 'text-gray-300'}`}>
          {puzzle.title}
        </div>
        </>
        )}
      </div>

      <div className={`w-full px-3 xl:px-4 2xl:px-6 h-8 xl:h-10 2xl:h-12 flex items-center justify-between sticky top-0 backdrop-blur ${headerCollapsed ? '' : 'border-t'} border-b z-20 transition-[height,background-color] duration-300 ease-out ${settings.lightMode ? 'bg-white/90 border-gray-300' : 'bg-black/80 border-gray-800'}`}>
        <div className={`flex items-center gap-2 text-xs xl:text-sm 2xl:text-base ${settings.lightMode ? 'text-gray-800' : 'text-gray-300'}`}>
          <div
            ref={starsRef}
            className={`px-2 py-0.5 rounded border flex items-center gap-0.5 cursor-pointer ${settings.lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900/40'}`}
            title="Current stars"
            role="button"
            tabIndex={0}
            onClick={showStarsInfo}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showStarsInfo(); } }}
          >
            <span className={`leading-none ${currentStars >= 1 ? 'text-yellow-300' : 'text-gray-500'}`}>★</span>
            <span className={`leading-none ${currentStars >= 2 ? 'text-yellow-300' : 'text-gray-500'}`}>★</span>
            <span className={`leading-none ${currentStars >= 3 ? 'text-yellow-300' : 'text-gray-500'}`}>★</span>
        </div>
        {!hideZeroTime && (
          <div className={`ml-2 px-2 py-0.5 rounded border text-xs xl:text-sm font-mono tabular-nums select-none ${settings.lightMode ? 'border-gray-300 bg-white text-gray-800' : 'border-gray-700 bg-gray-900/40 text-gray-300'}`} title="Elapsed time">
            {formatElapsed(elapsedMs)}
          </div>
        )}
          {pointsNow === 0 && (
            <div className={`${settings.lightMode ? 'px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-700' : 'px-2 py-0.5 rounded border border-red-600 bg-red-900/40 text-red-300'}`}>
              {didFail ? 'You already lost.' : 'Next misstep loses the game!'}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Lifeline button */}
          <div ref={lifelineRef} className="relative">
            <button
              onClick={() => setShowLifelineMenu((v) => !v)}
              className={`px-2 py-0.5 rounded-md text-xs border flex items-center justify-center min-h-[20px] w-8 ${settings.lightMode ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-700 text-gray-300 hover:bg-gray-900/40'}`}
              aria-label="Hints"
            >
              <span className="relative inline-flex items-center justify-center" aria-hidden>
                <span className={`absolute w-3 h-3 rounded-full ${settings.lightMode ? 'bg-yellow-300/30' : 'bg-yellow-400/20'} blur-[0.5px]`}></span>
                <span
                  className={`${settings.lightMode ? 'text-yellow-500' : 'text-yellow-400'}`}
                  style={{ filter: 'drop-shadow(0 0 2px #fde047)' }}
                >
                  💡
                </span>
              </span>
            </button>
            <LifelineMenu
              showLifelineMenu={showLifelineMenu}
              setShowLifelineMenu={setShowLifelineMenu}
              lifelineLevel={lifelineLevel}
              generatePrefixData={generatePrefixData}
              showPrefixes={showPrefixes}
              extendPrefixes={extendPrefixes}
              canExtend={canExtend}
              lifelinesUsed={lifelinesUsed}
              isQuick={isQuick}
              lightMode={settings.lightMode}
              onRevealFirst3={handleRevealFirst3}
              onRevealLast3={handleRevealLast3}
              onRevealMiddle3={handleRevealMiddle3}
              onRevealFirstLastStep={handleRevealFirstLastStep}
              onGiveUpReveal={(type) => {
                if (type === 'letter') {
                  // Reveal letter immediately without confirmation
                  revealTileAt(level, cursor);
                  
                  // Track letter reveal usage
                  try {
                    if (window.gtag && typeof window.gtag === 'function') {
                      window.gtag('event', 'reveal_used', {
                        reveal_type: 'letter',
                        puzzle_id: puzzle.id || 'unknown',
                        mode: isQuick ? 'quick' : 'main'
                      });
                    }
                  } catch {}
                } else if (type === 'word') {
                  setShowWordRevealConfirm(true);
                } else {
                  setShowWordRevealConfirm(true);
                }
              }}
            />
          </div>
          <button
            onClick={() => setShowHowToPlay(true)}
            className={`px-2 py-0.5 rounded-md text-xs border flex items-center justify-center min-h-[20px] w-8 ${settings.lightMode ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-700 text-gray-300 hover:bg-gray-900/40'}`}
            title="How to Play"
          >
            ?
          </button>
          {/* Settings gear moved to right */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`px-2 py-0.5 rounded-md text-xs border flex items-center justify-center min-h-[20px] w-8 ${settings.lightMode ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-700 text-gray-300 hover:bg-gray-900/40'}`}
              aria-label="Settings"
            >
              ⚙️
            </button>
            {showSettings && (
              <div className={`absolute right-0 top-full mt-1 w-60 rounded-lg border backdrop-blur-sm shadow-xl p-2 text-xs menu-pop-in ${settings.lightMode ? 'border-gray-300 bg-white ring-1 ring-black/5' : 'border-gray-700 bg-gray-900/95 ring-1 ring-white/10'}`}>
                <label className="flex items-center justify-between py-1">
                  <span className={`${settings.lightMode ? 'text-gray-700' : 'text-gray-300'}`}>Light mode</span>
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
                        document.dispatchEvent(new CustomEvent('stepwords-settings-updated', { detail: { lightMode: checked } }));
                      } catch {}
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.lightMode ? 'bg-sky-500' : 'bg-gray-600'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500`}
                    aria-label="Toggle light mode"
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.lightMode ? 'translate-x-4' : 'translate-x-1'}`}></span>
        </button>
                </label>
                <div className={`text-[10px] mb-2 ${settings.lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Invert colors for a light appearance.</div>
                <label className="flex items-center justify-between py-1">
                  <span className={`${settings.lightMode ? 'text-gray-800' : 'text-gray-300'}`}>Hard mode</span>
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
                <div className={`text-[10px] mb-2 ${settings.lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  {(() => {
                    const iso = getTodayIsoInET();
                    let emoji = '🪜';
                    try {
                      const [y,m,d] = iso.split('-').map(Number);
                      if (y === 2025 && m === 11 && d === 2) emoji = '🏃‍♀️';
                      else if (m === 10 && d >= 28 && d <= 31) emoji = '🎃';
                    } catch {}
                    return <>Hides step locations ({emoji}) until revealed. Saved as your default.</>;
                  })()}
                </div>

                <label className="flex items-center justify-between py-1">
                  <span className={`${settings.lightMode ? 'text-gray-800' : 'text-gray-300'}`}>Easy mode</span>
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
                <div className={`text-[10px] ${settings.lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Filters keyboard to letters in this puzzle. Saved as your default.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top toast */}
      <Toast text={toast} variant={toastVariant} lightMode={settings.lightMode} />

      <div ref={clueBarRef} className={`w-full px-3 py-2 sticky top-[32px] backdrop-blur border-b z-10 ${settings.lightMode ? 'bg-gray-100/95 border-gray-300' : 'bg-gray-900/95 border-sky-900/60'}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => moveLevel(-1)}
            aria-label="Previous word"
            className={`px-2 py-1 rounded ${settings.lightMode ? 'text-gray-800 hover:bg-gray-200' : 'text-gray-300 hover:text-white hover:bg-gray-900/40'}`}
          >
            ←
          </button>
          <div className={`text-sm xl:text-base 2xl:text-lg mx-2 flex-1 text-center ${settings.lightMode ? 'text-gray-800' : 'text-gray-300'}`}>
            <span className="font-semibold">Clue:</span> {renderClueText(clue)}
          </div>
        <button
            onClick={() => moveLevel(1)}
            aria-label="Next word"
            className={`px-2 py-1 rounded ${settings.lightMode ? 'text-gray-800 hover:bg-gray-200' : 'text-gray-300 hover:text-white hover:bg-gray-900/40'}`}
          >
            →
        </button>
        </div>
      </div>



      <div 
        id="grid-scroll"
        className="flex-1 overflow-y-auto pt-5 sm:pt-4 md:pt-3 pb-8"
        onClick={() => {
          if (!isMobile && inputRef.current) {
            inputRef.current.focus();
          } else if (isIOS && rowInputRefs.current[level]) {
            try { rowInputRefs.current[level].focus(); } catch {}
          }
        }}
      >
        {/* Hidden input(s) for keyboard capture */}
        {isIOS ? (
          <div className="absolute opacity-0 w-0 h-0" aria-hidden>
            {rows.map((_, i) => (
              <input
                key={i}
                ref={(el) => { rowInputRefs.current[i] = el; }}
                onFocus={() => { setLevel(i); }}
                onKeyDown={onKeyDown}
                onChange={onTextInput}
                value={ime}
                inputMode="text"
                enterKeyHint="done"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            ))}
          </div>
        ) : (
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
        )}

        <LetterGrid
          rows={rows}
          guesses={guesses}
          lockColors={lockColors}
          stepIdx={stepIdx}
          hardMode={settings.hardMode}
          lightMode={settings.lightMode}
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

        <div className={`text-xs px-3 mt-1 mb-2 ${settings.lightMode ? 'text-gray-600' : 'text-gray-300'}`}>{message}</div>
        {/* Spacer equal to keyboard height (updated dynamically) */}
        <div id="bottom-scroll-spacer" className="h-0" aria-hidden />
      </div>

      {/* Sticky keyboard at bottom */}
      <OnScreenKeyboard
        lightMode={settings.lightMode}
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
        collapsed={kbCollapsed}
        onToggleCollapse={(next) => {
          try {
            if (next) {
              localStorage.setItem('stepwords-kb-collapsed','1');
              // first-time coachmark
              if (localStorage.getItem('stepwords-kb-collapse-coach') !== '1') {
                // Wait for collapse animation to finish, then place coachmark at the arrow's new location
                setTimeout(() => {
                  const btn = collapseBtnRef.current;
                  if (btn) {
                    const r = btn.getBoundingClientRect();
                    const mark = document.createElement('div');
                    mark.style.position = 'fixed';
                    mark.style.left = (r.left + r.width / 2) + 'px';
                    mark.style.transform = 'translateX(-50%)';
                    // Place just above the collapsed arrow location
                    mark.style.top = Math.max(8, r.top - 28) + 'px';
                    mark.style.zIndex = '9999';
                    mark.style.pointerEvents = 'none';
                    mark.className = 'px-2 py-1 rounded bg-sky-700 text-white text-xs border border-sky-500 shadow';
                    mark.textContent = 'Tap ▲ to uncollapse the keyboard';
                    document.body.appendChild(mark);
                    setTimeout(()=>{ try { document.body.removeChild(mark); } catch {} }, 2600);
                    localStorage.setItem('stepwords-kb-collapse-coach','1');
                  }
                }, 340);
              }
            } else {
              localStorage.removeItem('stepwords-kb-collapsed');
            }
          } catch {}
          setKbCollapsed(next);
        }}
        toggleRef={collapseBtnRef}
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
          elapsedTime={!hideZeroTime ? formatElapsed(elapsedMs) : null}
          lightMode={settings.lightMode}
          onShare={() => {
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
          onClose={() => {
            setShowShare(false);
          }}
        />
      )}


      {showHowToPlay && (
        <HowToPlayModal onClose={handleCloseHowToPlay} lightMode={settings.lightMode} />
      )}
      {showQuickIntro && (
        <QuickIntroModal onClose={() => { setShowQuickIntro(false); try { localStorage.setItem('quickstep-intro-shown','1'); } catch {} }} lightMode={settings.lightMode} />
      )}
      {/* Reveal confirmation modal */}
      <RevealConfirmModal
        showWordRevealConfirm={showWordRevealConfirm}
        setShowWordRevealConfirm={setShowWordRevealConfirm}
        revealCurrentWord={revealCurrentWord}
        lightMode={settings.lightMode}
      />

      {showLoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className={`w-full max-w-sm rounded-lg border p-4 ${settings.lightMode ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-700 bg-gray-900 text-gray-200'}`}>
            <div className="text-lg font-semibold mb-2">Out of missteps</div>
            <div className={`text-sm mb-4 ${settings.lightMode ? 'text-gray-700' : ''}`}>You ran out of missteps. Better luck tomorrow!</div>
            <div className="flex justify-end gap-2 text-sm">
              <button
                className={`px-3 py-1.5 rounded-md border ${settings.lightMode ? 'border-gray-300 text-gray-800 hover:bg-gray-100' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
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
