import React, { useState, useEffect, useRef } from "react";

/**
 * Stepwords – mobile-friendly dark UI
 * - Tiles much smaller on mobile; no gaps so 15 letters fit without horizontal scroll
 * - No left/right margins; content uses full viewport width
 * - Bottom space reserved so keyboard doesn't cover the board (page scrolls)
 * - Arrow keys skip locked (green) tiles; Tab/Shift+Tab move rows; Enter/Submit locks correct letters
 * - Mobile keyboard shown via hidden input; "return" key hints "done" and submits
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
  { answer: "ton", clue: "Colossal amount (3)" },
  { answer: "into", clue: "A fan of (4)" },
  { answer: "notin", clue: "Away at the moment (3,2)" },
  { answer: "inonit", clue: "Part of a prank (2,2,2)" },
  { answer: "sitinon", clue: "Audit (3,2,2)" },
  { answer: "unionist", clue: "Lincoln, for one (8)" },
  { answer: "munitions", clue: "Arms (9)" },
  { answer: "minidonuts", clue: "Little dippers? (10)" },
  { answer: "dismounting", clue: "Getting off one's high horse? (11)" },
];

const clean = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");

function LetterBox({ char = "", state = "empty", isCursor = false, onClick }) {
  // On mobile, size based on viewport width so 15 fit across (no horizontal scroll)
  // 15 * 6.2vw ≈ 93vw -> fits with borders
  const base =
    "inline-flex items-center justify-center border rounded-[6px] select-none uppercase font-bold " +
    "w-[6.2vw] h-[6.2vw] text-[3.4vw] " + // mobile default
    "sm:w-8 sm:h-8 sm:text-sm md:w-10 md:h-10 md:text-base"; // scale up on larger screens
  const cls = state === "good"
    ? "bg-green-600 border-green-500 text-white"
    : "bg-gray-900 border-gray-700 text-gray-200"; // single darker style for all empties
  const ring = isCursor ? " outline outline-2 outline-sky-400" : "";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}${ring}`}>{char}</button>
  );
}

export default function Stepwords() {
  const [level, setLevel] = useState(0);
  const [guesses, setGuesses] = useState(() => PUZZLE.map(() => ""));
  const [locks, setLocks] = useState(() => PUZZLE.map((p) => Array(p.answer.length).fill(false)));
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [ime, setIme] = useState("");

  const answer = PUZZLE[level].answer.toUpperCase();
  const clue = PUZZLE[level].clue;

  const rowLen = (r) => PUZZLE[r].answer.length;
  const isLocked = (r, c) => Boolean(locks[r]?.[c]);

  useEffect(() => {
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
      const len = rowLen(next);
      let targetCol = Math.min(len - 1, cursor);
      if (isLocked(next, targetCol)) {
        targetCol = nearestUnlockedInRow(next, targetCol);
        if (targetCol === -1) targetCol = 0;
      }
      setCursor(targetCol);
      return next;
    });
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
    const len = rowLen(level);
    let col = cursor;
    for (let t = 0; t < len; t++) {
      col += direction;
      if (col < 0 || col >= len) break;
      if (!isLocked(level, col)) { setCursor(col); return; }
    }
  }

  function typeChar(ch) {
    const len = rowLen(level);
    if (isLocked(level, cursor)) {
      const nextPos = nearestUnlockedInRow(level, cursor);
      if (nextPos === -1) return;
      setCursor(nextPos);
    }
    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    const next = (cur.slice(0, cursor) + ch.toUpperCase() + cur.slice(cursor + 1)).slice(0, len).trimEnd();
    setGuessAt(level, next);
    let pos = cursor;
    for (let t = 0; t < len; t++) {
      pos += 1;
      if (pos >= len) break;
      if (!isLocked(level, pos)) { setCursor(pos); break; }
    }
    setMessage("");
  }

  function onKeyDown(e) {
    if (e.key === "Tab") { e.preventDefault(); moveLevel(e.shiftKey ? -1 : 1); return; }
    if (e.key === "Enter") { e.preventDefault(); submitRow(level); return; }
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
    if (e.key === "ArrowLeft") { e.preventDefault(); stepCursorInRow(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); stepCursorInRow(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (level > 0) moveLevel(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (level < PUZZLE.length - 1) moveLevel(1); return; }
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); typeChar(e.key); return; }
  }

  function onTextInput(e) {
    const v = e.target.value || "";
    const letters = v.match(/[a-zA-Z]/g);
    if (letters && letters.length) typeChar(letters[letters.length - 1]);
    setIme("");
  }

  return (
    <div className="min-h-screen w-screen overflow-y-auto bg-black text-gray-100 flex flex-col items-start pt-4 pb-[22vh] px-0">
      <h1 className="text-xl font-semibold mb-1 px-3 w-full">Stepwords</h1>
      <div className="text-xs text-gray-400 mb-3 px-3 w-full">Climb the ladder, one letter at a time.</div>

      <div className="mb-3 text-sm text-gray-300 px-3 w-full"><span className="font-semibold">Clue:</span> {clue}</div>

      {/* Hidden input to capture typing & mobile keyboards */}
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

      <div className="w-full flex flex-col items-start gap-1 select-none">
        {PUZZLE.map((p, i) => {
          const len = p.answer.length;
          const showVal = (guesses[i] || "").toUpperCase();
          return (
            <div key={i} className="w-full flex flex-row gap-0 px-0">
              {/* Row of tiles: no gap so 15 fit across */}
              <div className="flex gap-0 px-0 mx-0">
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

      {/* Spacer so keyboard doesn't cover content; pb also set on root */}
      <div className="w-full" style={{ height: "20vh" }} />

      <div className="mt-2 text-[11px] text-gray-500 px-3 pb-safe">
        Arrows move among available squares (greens are skipped). Tab/Shift+Tab change rows without submitting. Enter/Submit keeps only correct letters and erases the rest.
      </div>
    </div>
  );
}
