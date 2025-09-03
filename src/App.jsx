import React, { useState, useEffect, useRef } from "react";

/**
 * Stepwords – dark mode + mobile keyboard + arrow/tab navigation
 */

// const PUZZLE = [
//   { answer: "ten", clue: "Perfect score, but only half a perfect hand" },
//   { answer: "rent", clue: "Tear in your jeans, or what you pay for them" },
//   { answer: "inert", clue: "Not moving at all, except maybe in chemistry class" },
//   { answer: "orient", clue: "Adjust your compass, or head toward the East" },
//   { answer: "protein", clue: "Egg component that's not about the shell" },
//   { answer: "pointier", clue: "Sharper take on a remark?" },
//   { answer: "priesinto", clue: "Meddles where it doesn’t belong, like a nosy neighbor" },
//   { answer: "reposition", clue: "Move again, or market yourself anew" },
//   { answer: "preposition", clue: "Word that can show you where you’re at (literally)" },
//   { answer: "prepositions", clue: "They might be found before a noun, or before trouble" },
//   { answer: "superposition", clue: "State of being in two states at once (quantumly speaking)" },
//   { answer: "presupposition", clue: "Assumption made before you even know you’ve made it" },
// ];

const PUZZLE = [
  { answer: "inonit", clue: "Part of a prank" },
  { answer: "sitinon", clue: "Audit" },
  { answer: "unionist", clue: "Lincoln, for one" },
  { answer: "munitions", clue: "Arms" },
  { answer: "minidonuts", clue: "Little dippers?" },
  { answer: "dismounting", clue: "Getting off one's high horse?" },
];

const clean = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");

function LetterBox({ char = "", state = "empty", isCursor = false, onClick }) {
  // state: empty | good
  const base =
    "w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-md border flex items-center justify-center text-base md:text-lg font-bold uppercase select-none transition-colors";
  const cls =
    state === "good"
      ? "bg-green-600 border-green-500 text-white"
      : "bg-gray-900 border-gray-700 text-gray-200"; // single darker style for all empties
  const ring = isCursor ? " outline outline-2 outline-sky-400" : "";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}${ring}`}>
      {char}
    </button>
  );
}

export default function Stepwords() {
  const [level, setLevel] = useState(0);
  const [guesses, setGuesses] = useState(() => PUZZLE.map(() => "")); // per row string (only unlocked letters kept)
  const [locks, setLocks] = useState(() =>
    PUZZLE.map((p) => Array(p.answer.length).fill(false))
  ); // per-letter correctness lock (green)
  const [cursor, setCursor] = useState(0); // column index in current row
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [ime, setIme] = useState(""); // tiny buffer for mobile keyboards

  // helpers
  const rowLen = (r) => PUZZLE[r].answer.length;
  const isLocked = (r, c) => Boolean(locks[r]?.[c]);

  const answer = PUZZLE[level].answer.toUpperCase();
  const clue = PUZZLE[level].clue;

  useEffect(() => {
    // focus hidden input so desktop & mobile capture keystrokes
    inputRef.current?.focus();
    setCursor(0);
    setMessage("");
  }, [level]);

  function setGuessAt(i, next) {
    setGuesses((prev) => prev.map((g, idx) => (idx === i ? next : g)));
  }

  function setLockAtRow(i, newLocks) {
    setLocks((prev) => prev.map((row, idx) => (idx === i ? newLocks : row)));
  }

  function nearestUnlockedInRow(row, col) {
    const len = rowLen(row);
    if (!isLocked(row, col)) return col;
    for (let d = 1; d < len; d++) {
      const r = col + d;
      const l = col - d;
      if (r < len && !isLocked(row, r)) return r;
      if (l >= 0 && !isLocked(row, l)) return l;
    }
    return -1;
  }

  function stepCursorInRow(direction) {
    // direction: +1 right, -1 left; skip greens
    const len = rowLen(level);
    let col = cursor;
    for (let t = 0; t < len; t++) {
      col += direction;
      if (col < 0 || col >= len) break;
      if (!isLocked(level, col)) {
        setCursor(col);
        return;
      }
    }
    // else stay
  }

  function moveLevel(delta) {
    setLevel((l) => {
      const next = Math.max(0, Math.min(PUZZLE.length - 1, l + delta));
      const len = rowLen(next);
      let targetCol = Math.min(len - 1, cursor);
      if (isLocked(next, targetCol)) {
        const n = nearestUnlockedInRow(next, targetCol);
        targetCol = n === -1 ? 0 : n;
      }
      setCursor(targetCol);
      return next;
    });
  }

  function typeChar(ch) {
    const len = rowLen(level);
    if (isLocked(level, cursor)) {
      const nextPos = nearestUnlockedInRow(level, cursor);
      if (nextPos === -1) return; // row fully locked
      setCursor(nextPos);
    }
    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    const next = (cur.slice(0, cursor) + ch.toUpperCase() + cur.slice(cursor + 1))
      .slice(0, len)
      .trimEnd();
    setGuessAt(level, next);
    // advance to next available (skip locked)
    let pos = cursor;
    for (let t = 0; t < len; t++) {
      pos += 1;
      if (pos >= len) break;
      if (!isLocked(level, pos)) {
        setCursor(pos);
        break;
      }
    }
    setMessage("");
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

    if (nextLocks.every(Boolean)) {
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
    if (e.key === "ArrowLeft") { e.preventDefault(); stepCursorInRow(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); stepCursorInRow(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (level > 0) moveLevel(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (level < PUZZLE.length - 1) moveLevel(1); return; }

    // Hardware keyboard typing
    if (/^[a-z]$/i.test(e.key)) {
      e.preventDefault();
      typeChar(e.key);
      return;
    }
  }

  // Mobile virtual keyboard input
  function onTextInput(e) {
    const v = e.target.value || "";
    const letters = v.match(/[a-zA-Z]/g);
    if (letters && letters.length) {
      typeChar(letters[letters.length - 1]);
    }
    setIme("");
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-start py-8 px-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-2">Stepwords</h1>
      <div className="text-sm text-gray-400 mb-4">Climb the ladder, one letter at a time.</div>

      <div className="mb-4 text-gray-300">
        <span className="font-semibold">Clue:</span> {clue}
      </div>

      {/* Hidden input for mobile keyboards & input capture */}
      <input
        ref={inputRef}
        className="absolute opacity-0 pointer-events-none -left-[9999px] w-px h-px"
        inputMode="latin"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onChange={onTextInput}
        value={ime}
        onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)} // keep focus so mobile KB stays up
        aria-hidden
      />

      <div className="flex flex-col items-start gap-1.5 sm:gap-2">
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
                    state={locks[i][col] ? "good" : "empty"}
                    isCursor={i === level && col === cursor}
                    onClick={() => {
                      if (!locks[i][col]) {
                        setLevel(i);
                        setCursor(col);
                        inputRef.current?.focus(); // open mobile keyboard
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

      <div className="mt-4 text-xs text-gray-500">
        Arrows move among available squares (greens are skipped). Tab/Shift+Tab change rows without submitting.
        Enter/Submit keeps only correct letters and erases the rest.
      </div>
    </div>
  );
}
