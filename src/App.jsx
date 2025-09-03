import React, { useState, useEffect, useRef } from "react";

/**
 * Stepwords – dark mode + navigation polish
 * - Arrow keys move among available (non-green) squares; skip green
 * - Up/Down move between rows; keep column when possible; skip green
 * - Empty squares use a single darker style everywhere
 * - Tab/Shift+Tab still move between words without submitting
 * - Enter/Submit keeps only correct letters (green) and erases others
 */

const PUZZLE = [
  { answer: "inonit", clue: "Part of a prank" },
  { answer: "sitinon", clue: "Audit" },
  { answer: "unionist", clue: "Lincoln, for one" },
  { answer: "munitions", clue: "Arms" },
  { answer: "minidonuts", clue: "Little dippers?" },
  { answer: "dismounting", clue: "Getting off one's high horse?" },
];


// const PUZZLE = [
//   { answer: "ten", clue: "Perfect score or half a score" },
//   { answer: "rent", clue: "Flat fee?" },
//   { answer: "inert", clue: "Like a noble gas" },
//   { answer: "orient", clue: "Set straight" },
//   { answer: "protein", clue: "Amino acid chain" },
//   { answer: "pointier", clue: "Sharper" },
//   { answer: "priesinto", clue: "Snoops around (4,4)" },
//   { answer: "reposition", clue: "Move" },
//   { answer: "preposition", clue: "In, for, or at" },
//   { answer: "prepositions", clue: "In, for, and at" },
//   { answer: "superposition", clue: "In two places at once in quantum mechanics" },
//   { answer: "presupposition", clue: "Assumption" },
// ];

const clean = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");

function LetterBox({ char = "", state = "empty", isCursor = false, onClick }) {
  // state: empty | good
  const base =
    "w-10 h-10 sm:w-12 sm:h-12 rounded-md border flex items-center justify-center text-sm sm:text-base font-bold uppercase select-none transition-colors";
  const cls = state === "good"
    ? "bg-green-600 border-green-500 text-white"
    : "bg-gray-900 border-gray-600 text-gray-200"; // single darker style for all empties
  const ring = isCursor ? " outline outline-2 outline-sky-400" : "";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}${ring}`}>{char}</button>
  );
}

export default function Stepwords() {
  const [level, setLevel] = useState(0);
  const [guesses, setGuesses] = useState(() => PUZZLE.map(() => ""));
  const [locks, setLocks] = useState(() => PUZZLE.map((p) => Array(p.answer.length).fill(false))); // per-letter correctness
  const [cursor, setCursor] = useState(0); // col index
  const [message, setMessage] = useState("");
  const keyTargetRef = useRef(null);

  const answer = PUZZLE[level].answer.toUpperCase();
  const clue = PUZZLE[level].clue;

  // helpers
  const rowLen = (r) => PUZZLE[r].answer.length;
  const isLocked = (r, c) => Boolean(locks[r]?.[c]);

  useEffect(() => {
    keyTargetRef.current?.focus();
    setCursor(0);
    setMessage("");
  }, [level]);

  function setGuessAt(i, next) {
    setGuesses((prev) => prev.map((g, idx) => (idx === i ? next : g)));
  }
  function setLockAtRow(i, newLocks) {
    setLocks((prev) => prev.map((row, idx) => (idx === i ? newLocks : row)));
  }

  function submitRow(i) {
    const ans = PUZZLE[i].answer.toUpperCase();
    const len = ans.length;
    const cur = (guesses[i] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    const keep = Array(len).fill(" ");
    const nextLocks = locks[i].slice();
    for (let k = 0; k < len; k++) {
      if (cur[k] === ans[k] && cur[k] !== " ") {
        keep[k] = cur[k];
        nextLocks[k] = true;
      } else {
        keep[k] = " ";
        nextLocks[k] = false;
      }
    }
    setGuessAt(i, keep.join("").trimEnd());
    setLockAtRow(i, nextLocks);

    const solved = nextLocks.every(Boolean);
    if (solved) {
      if (i + 1 < PUZZLE.length) {
        setLevel(i + 1);
        setMessage("Nice! Next word →");
      } else {
        setMessage("🎉 You solved all the Stepwords!");
      }
    } else {
      setMessage("Kept correct letters. Try filling the rest.");
    }
  }

  function moveLevel(delta) {
    setLevel((l) => {
      const next = Math.max(0, Math.min(PUZZLE.length - 1, l + delta));
      // try to keep same column; if locked there, find nearest unlocked
      const len = rowLen(next);
      let targetCol = Math.min(len - 1, cursor);
      if (isLocked(next, targetCol)) {
        targetCol = nearestUnlockedInRow(next, targetCol);
        if (targetCol === -1) targetCol = 0; // no available, fall back
      }
      setCursor(targetCol);
      return next;
    });
  }

  function nearestUnlockedInRow(row, col) {
    const len = rowLen(row);
    // check exact col first
    if (!isLocked(row, col)) return col;
    // search to right then left by increasing distance
    for (let d = 1; d < len; d++) {
      const right = col + d;
      const left = col - d;
      if (right < len && !isLocked(row, right)) return right;
      if (left >= 0 && !isLocked(row, left)) return left;
    }
    return -1; // none
  }

  function stepCursorInRow(direction) {
    // direction: +1 right, -1 left. Skip locked positions.
    const len = rowLen(level);
    let col = cursor;
    for (let t = 0; t < len; t++) {
      col = col + direction;
      if (col < 0 || col >= len) break;
      if (!isLocked(level, col)) {
        setCursor(col);
        return;
      }
    }
    // if we didn't find any, stay put
  }

  function onKeyDown(e) {
    const len = rowLen(level);
    if (e.key === "Tab") {
      e.preventDefault();
      moveLevel(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submitRow(level);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (cursor > 0) {
        const idx = cursor - 1;
        const cur = (guesses[level] || "").toUpperCase();
        const del = cur.slice(0, idx) + cur.slice(idx + 1);
        setGuessAt(level, del);
        setCursor(idx);
      }
      return;
    }

    // Arrow navigation
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepCursorInRow(-1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stepCursorInRow(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (level > 0) moveLevel(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (level < PUZZLE.length - 1) moveLevel(1);
      return;
    }

    // typing
    if (/^[a-z]$/i.test(e.key)) {
      e.preventDefault();
      const ch = clean(e.key).toUpperCase();
      // if current cell is locked, jump to nearest unlocked at/after cursor
      if (isLocked(level, cursor)) {
        const nextPos = nearestUnlockedInRow(level, cursor);
        if (nextPos === -1) return; // row fully locked
        setCursor(nextPos);
      }
      const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
      const next = (cur.slice(0, cursor) + ch + cur.slice(cursor + 1)).slice(0, len).trimEnd();
      setGuessAt(level, next);
      // advance to next available (skip locked)
      let advance = cursor;
      for (let t = 0; t < len; t++) {
        advance = advance + 1;
        if (advance >= len) break;
        if (!isLocked(level, advance)) { setCursor(advance); break; }
      }
      setMessage("");
      return;
    }
  }

  function letterState(rowIdx, colIdx) {
    return locks[rowIdx][colIdx] ? "good" : "empty";
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-start py-8 px-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-2">Stepwords</h1>
      <div className="text-sm text-gray-400 mb-4">Climb the ladder, one letter at a time.</div>

      <div className="mb-4 text-gray-300"><span className="font-semibold">Clue:</span> {clue}</div>

      {/* Hidden focus target to capture typing */}
      <button ref={keyTargetRef} onKeyDown={onKeyDown} className="sr-only" aria-hidden />

      <div className="flex flex-col items-start gap-2">
        {PUZZLE.map((p, i) => {
          const len = p.answer.length;
          const showVal = (guesses[i] || "").toUpperCase();
          return (
            <div key={i} className="flex">
              <div className="flex gap-2">
                {Array.from({ length: len }).map((_, col) => (
                  <LetterBox
                    key={col}
                    char={showVal[col] || ""}
                    state={letterState(i, col)}
                    isCursor={i === level && col === cursor}
                    onClick={() => {
                      if (!locks[i][col]) {
                        setLevel(i);
                        setCursor(col);
                        keyTargetRef.current?.focus();
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-6 mt-3 text-sm text-gray-300">{message}</div>

      <div className="mt-3">
        <button
          onClick={() => submitRow(level)}
          className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold shadow hover:bg-green-700"
        >
          Submit
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">Arrows move among available squares (greens are skipped). Tab/Shift+Tab change rows without submitting. Enter/Submit keeps only correct letters and erases the rest.</div>
    </div>
  );
}
