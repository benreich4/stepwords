import React, { useEffect, useRef, useState } from "react";
import LetterBox from "./components/LetterBox.jsx";
import { formatLongDate } from "./lib/date.js"
export default function Game({ puzzle }) {
  const rows = puzzle.rows; // [{answer, clue}, ...] shortest→longest
  const stepIdx = computeStepIndices(rows);
  const [lockColors, setLockColors] = useState(
    () => rows.map(r => Array(r.answer.length).fill(null))
  );
  const isLocked = (r, c) => Boolean(lockColors[r]?.[c]);
  const [level, setLevel] = useState(0);
  const [guesses, setGuesses] = useState(() => rows.map(() => ""));
  const [locks, setLocks] = useState(() => rows.map(r => Array(r.answer.length).fill(false)));
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [ime, setIme] = useState("");
  // Hint system: arm once, then reveal by tapping any confirmed letter (green)
  const [hintArmed, setHintArmed] = useState(false);
  const [revealedLetters, setRevealedLetters] = useState(new Set()); // letters we've revealed across the grid
  
  // color order tokens
  const COLOR_ORDER = ["G","B","P","R","O","Y","N","K","W","B","P","R","O","Y","N","K","W"];

  function letterCounts(s) {
    const m = new Map();
    for (const ch of s) m.set(ch, (m.get(ch) || 0) + 1);
    return m;
  }

  // Which letter was added at each step (row index >= 1)
  function computeStepLetters(rows) {
    const stepLetters = [null]; // row 0 has no step
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1].answer.toUpperCase();
      const cur  = rows[i].answer.toUpperCase();
      const pc = letterCounts(prev), cc = letterCounts(cur);
      let added = null;
      for (const [ch, cnt] of cc.entries()) {
        if (cnt > (pc.get(ch) || 0)) { added = ch; break; }
      }
      stepLetters.push(added); // one letter per step
    }
    return stepLetters;
  }

  /**
   * Compute color tokens for the FINAL row, based on when each letter INSTANCE
   * first appeared (base word -> G; each added instance -> that step’s color).
   * Returns an array of tokens (e.g., ['G','G','B','P',...]) length = final word length.
   */
  function computeFinalRowTokens(rows) {
    const n = rows.length;
    if (n === 0) return [];
    const base = rows[0].answer.toUpperCase();
    const finalAns = rows[n - 1].answer.toUpperCase();

    // Count how many instances each letter already had in the base word
    const baseCount = letterCounts(base);

    // Collect which steps added which letter (by row index)
    const stepLetters = computeStepLetters(rows);
    const stepBuckets = new Map(); // letter -> [rowIndex, rowIndex, ...] ascending
    for (let i = 1; i < stepLetters.length; i++) {
      const ch = stepLetters[i];
      if (!ch) continue;
      if (!stepBuckets.has(ch)) stepBuckets.set(ch, []);
      stepBuckets.get(ch).push(i);
    }

    // Assign a color to each position in the final word
    const tokens = [];
    for (const ch of finalAns) {
      if ((baseCount.get(ch) || 0) > 0) {
        // This instance existed from the start -> green
        tokens.push("G");
        baseCount.set(ch, baseCount.get(ch) - 1);
      } else {
        // Take the earliest step that added this letter
        const arr = stepBuckets.get(ch) || [];
        const stepIdx = arr.shift(); // row index that added this instance
        const token = COLOR_ORDER[Math.min(stepIdx ?? 0, COLOR_ORDER.length - 1)];
        tokens.push(token || "G"); // fallback to green if anything odd
      }
    }
    return tokens;
  }

  function letterCounts(s) {
    const m = new Map();
    for (const ch of s) m.set(ch, (m.get(ch) || 0) + 1);
    return m;
  }
  function computeStepIndices(rows) {
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      if (i === 0) { out.push(-1); continue; }
      const prev = rows[i-1].answer.toUpperCase();
      const cur  = rows[i].answer.toUpperCase();
      const pc = letterCounts(prev), cc = letterCounts(cur);
      let stepLetter = null;
      for (const [ch, cnt] of cc.entries()) {
        const diff = cnt - (pc.get(ch) || 0);
        if (diff > 0) { stepLetter = ch; break; }
      }
      out.push(stepLetter ? cur.lastIndexOf(stepLetter) : -1);
    }
    return out;
  }

  function applyHintSingle(row, col) {
    const ans = rows[row].answer.toUpperCase();
    const len = ans.length;
    const correct = ans[col];
    if (!correct) return;

    // Already locked? nothing to do.
    if (lockColors[row]?.[col]) return;

    // Update guess at (row,col)
    const cur = (guesses[row] || "").toUpperCase().padEnd(len, " ").slice(0, len).split("");
    cur[col] = correct;

    // Color: step color if this is the step position on this row, else green
    const stepColor = COLOR_ORDER[Math.min(row, COLOR_ORDER.length - 1)];
    const isStepPos = row >= 1 && col === stepIdx[row];
    const token = isStepPos ? stepColor : "G";

    const nextRowColors = lockColors[row].slice();
    nextRowColors[col] = token;

    setGuessAt(row, cur.join("").trimEnd());
    setLockColors(prev => prev.map((r, i) => (i === row ? nextRowColors : r)));

    // If row is now solved, advance; else move caret to next open cell
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

    // Move to the next available cell to the right (stay on same row)
    let target = col;
    for (let k = col + 1; k < len; k++) {
      if (!nextRowColors[k]) { target = k; break; }
    }
    setLevel(row);
    setCursor(target);
    requestAnimationFrame(() => inputRef.current?.focus());
  }



  function tileHasHint(rowIndex, colIndex) {
    const L = rows[rowIndex].answer.toUpperCase()[colIndex];
    return revealedLetters.has(L);
  }

  const rowLen = (r) => rows[r].answer.length;

  useEffect(() => {
    inputRef.current?.focus();
    setMessage("");
  }, [level]);


  const answer = rows[level].answer.toUpperCase();
  const clue = rows[level].clue;

  function setGuessAt(i, next) {
    setGuesses(prev => prev.map((g, idx) => (idx === i ? next : g)));
  }
  function setLockAtRow(i, newLocks) {
    setLocks(prev => prev.map((row, idx) => (idx === i ? newLocks : row)));
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
      const next = Math.max(0, Math.min(rows.length - 1, l + delta));
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
    const nextColors = lockColors[i].slice();

    const stepColor = COLOR_ORDER[Math.min(i, COLOR_ORDER.length - 1)];
    const sPos = stepIdx[i];

    for (let k = 0; k < len; k++) {
      if (cur[k] === ans[k] && cur[k] !== " ") {
        nextColors[k] = (k === sPos && i >= 1) ? stepColor : "G";
      } else {
        nextGuess[k] = " ";
        nextColors[k] = null;
      }
    }

    setGuessAt(i, nextGuess.join("").trimEnd());
    setLockColors(prev => prev.map((row, idx) => (idx === i ? nextColors : row)));

    const solved = nextColors.every(Boolean);

    if (solved) {
      // If this is the LAST row, repaint with “first appearance” colors
      if (i === rows.length - 1) {
        const finalTokens = computeFinalRowTokens(rows); // array of tokens for the final word
        setLockColors(prev => prev.map((row, idx) =>
          idx === i ? finalTokens.slice() : row
        ));
      }

      if (i + 1 < rows.length) {
        const nextRow = i + 1;
        setLevel(nextRow);
        const firstOpen = nearestUnlockedInRow(nextRow, 0);
        setCursor(firstOpen === -1 ? 0 : firstOpen);
        setMessage("Nice! Next word →");
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        setMessage("🎉 You solved all the Stepwords!");
      }
    } else {
      setMessage("Kept correct letters. Try filling the rest.");
    }

  }

  function onKeyDown(e) {
    // ✅ Let browser/system shortcuts work (Cmd/Ctrl combos, F5, etc.)
    if (e.metaKey || e.ctrlKey) return;              // Cmd+R/Cmd+L/Cmd+F, Ctrl+R/Ctrl+F...
    if (e.key === "F5") return;                      // Refresh
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return; // history nav

    if (e.key === "Tab") { e.preventDefault(); moveLevel(e.shiftKey ? -1 : 1); return; }
    if (e.key === "Enter") { e.preventDefault(); submitRow(level); return; }
    if (e.key === "Backspace") {
      e.preventDefault();
      const len = rowLen(level);
      const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);

      // Clear current square
      const updated =
        cur.slice(0, cursor) + " " + cur.slice(cursor + 1);

      setGuessAt(level, updated.trimEnd());

      // Move cursor left (but not before 0)
      setCursor(Math.max(0, cursor - 1));
      return;
    }

    if (e.key === "ArrowLeft") { e.preventDefault(); stepCursorInRow(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); stepCursorInRow(1); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); if (level > 0) moveLevel(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (level < rows.length - 1) moveLevel(1);  return; }
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); typeChar(e.key); return; }
  }

  function onTextInput(e) {
    const v = e.target.value || "";
    const letters = v.match(/[a-zA-Z]/g);
    if (letters && letters.length) typeChar(letters[letters.length - 1]);
    setIme("");
  }

  // A cell is force-revealed green if its answer letter is one of the revealed letters
  function tileForceReveal(rowIndex, colIndex) {
    const L = rows[rowIndex].answer.toUpperCase()[colIndex];
    return revealedLetters.has(L);
  }

  // Treat both real locks and hint-reveals as "blocked"
  function isBlocked(rowIndex, colIndex) {
    return Boolean(locks[rowIndex]?.[colIndex]) || tileForceReveal(rowIndex, colIndex);
  }



  return (
    <div className="w-screen min-h-screen overflow-y-auto bg-black pt-6 pb-[22vh]">
      <div className="px-3 text-center">
        {/* Big date */}
        {puzzle.date && (
          <div className="text-2xl sm:text-3xl font-bold text-gray-100 mb-1">
            {formatLongDate(puzzle.date)}
          </div>
        )}
        {/* Author byline */}
        {puzzle.author && (
          <div className="text-sm text-gray-400 mb-4">
            By {puzzle.author}
          </div>
        )}
        {/* Puzzle title */}
        <div className="text-base text-gray-300 italic mb-4">
          {puzzle.title}
        </div>

        {/* Clue */}
        <div className="mb-3 text-sm text-gray-300">
          <span className="font-semibold">Clue:</span> {clue}
        </div>
      </div>
      <div className="w-full px-3 py-2 flex items-center gap-2 sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 z-10">
        <button
          onClick={() => setHintArmed((v) => !v)}
          className={
            "px-3 py-1.5 rounded-md text-xs border " +
            (hintArmed ? "border-sky-500 text-sky-300 bg-sky-900/30"
                       : "border-gray-700 text-gray-300 hover:bg-gray-900/40")
          }
          aria-pressed={hintArmed}
        >
          {hintArmed ? "Tap a square to reveal all instances of that letter" : "Hint"}
        </button>

        {revealedLetters.size > 0 && (
          <div className="text-[11px] text-gray-400">
            Revealed: {[...revealedLetters].join(", ")}
          </div>
        )}

        <div className="ml-auto text-[11px] text-gray-500">
          Reveal letter
        </div>
      </div>

      {/* hidden input to capture typing & mobile keyboard */}
      <input
        ref={inputRef}
        onKeyDown={onKeyDown}
        onChange={onTextInput}
        value={ime}
        onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
        inputMode="latin"
        enterKeyHint="done"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="absolute opacity-0 pointer-events-none -left-[9999px] w-px h-px"
        aria-hidden
      />

      <div className="w-full flex flex-col items-start gap-1 select-none px-0">
        {rows.map((r, i) => {
          const len = r.answer.length;
          const showVal = (guesses[i] || "").toUpperCase();
          const stepPos = stepIdx[i]; // -1 for the first row
          return (
            <div key={i} className="w-full flex flex-row gap-0 px-0">
              <div className="flex gap-0 px-0 mx-0">
                {Array.from({ length: len }).map((_, col) => (
                  <LetterBox
                    key={col}
                    char={showVal[col] || ""}
                    state={lockColors[i][col]}                   // color token or null
                    isCursor={i === level && col === cursor}
                    showStep={i >= 1 && col === stepPos}         // <-- show 🪜 on step squares
                    onClick={() => {
                      if (hintArmed) {
                        applyHintSingle(i, col);  // 👈 reveal just this square
                        setHintArmed(false);      // disarm after one use
                      } else {
                        setLevel(i);
                        setCursor(col);
                        inputRef.current?.focus();
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-6 mt-3 text-xs text-gray-300 px-3">{message}</div>

      <div className="mt-2 px-3 w-full">
        <button
          onClick={() => submitRow(level)}
          className="w-full max-w-sm px-3 py-2 rounded-md bg-green-600 text-white text-sm font-semibold shadow hover:bg-green-700"
        >
          Submit
        </button>
      </div>

      <div className="w-full" style={{ height: "20vh" }} />
    </div>
  );
}
