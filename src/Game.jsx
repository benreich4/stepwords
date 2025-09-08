import React, { useEffect, useRef, useState } from "react";
import LetterBox from "./components/LetterBox.jsx";

export default function Game({ puzzle }) {
  const rows = puzzle.rows; // [{answer, clue}, ...] shortest→longest
  const [level, setLevel] = useState(0);
  const [guesses, setGuesses] = useState(() => rows.map(() => ""));
  const [locks, setLocks] = useState(() => rows.map(r => Array(r.answer.length).fill(false)));
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [ime, setIme] = useState("");

  const rowLen = (r) => rows[r].answer.length;
  const isLocked = (r, c) => Boolean(locks[r]?.[c]);

  useEffect(() => {
    inputRef.current?.focus();
    setCursor(0);
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
    if (!isLocked(row, col)) return col;
    for (let d = 1; d < len; d++) {
      const r = col + d, l = col - d;
      if (r < len && !isLocked(row, r)) return r;
      if (l >= 0 && !isLocked(row, l)) return l;
    }
    return -1;
  }

  function stepCursorInRow(dir) {
    const len = rowLen(level);
    let col = cursor;
    for (let t = 0; t < len; t++) {
      col += dir;
      if (col < 0 || col >= len) break;
      if (!isLocked(level, col)) { setCursor(col); return; }
    }
  }

  function moveLevel(delta) {
    setLevel(l => {
      const next = Math.max(0, Math.min(rows.length - 1, l + delta));
      const len = rowLen(next);
      let target = Math.min(len - 1, cursor);
      if (isLocked(next, target)) {
        const n = nearestUnlockedInRow(next, target);
        target = n === -1 ? 0 : n;
      }
      setCursor(target);
      return next;
    });
  }

  function typeChar(ch) {
    const len = rowLen(level);
    if (isLocked(level, cursor)) {
      const nextPos = nearestUnlockedInRow(level, cursor);
      if (nextPos === -1) return;
      setCursor(nextPos);
    }
    const cur = (guesses[level] || "").toUpperCase().padEnd(len, " ").slice(0, len);
    const next = (cur.slice(0, cursor) + ch.toUpperCase() + cur.slice(cursor + 1))
      .slice(0, len).trimEnd();
    setGuessAt(level, next);
    let pos = cursor;
    for (let t = 0; t < len; t++) {
      pos++;
      if (pos >= len) break;
      if (!isLocked(level, pos)) { setCursor(pos); break; }
    }
    setMessage("");
  }

  function submitRow(i) {
    const ans = rows[i].answer.toUpperCase();
    const len = ans.length;
    const cur = (guesses[i] || "").toUpperCase().padEnd(len, " ").slice(0, len);

    const keep = Array(len).fill(" ");
    const nextLocks = locks[i].slice();
    for (let k = 0; k < len; k++) {
      if (cur[k] === ans[k] && cur[k] !== " ") { keep[k] = cur[k]; nextLocks[k] = true; }
      else { keep[k] = " "; nextLocks[k] = false; }
    }
    setGuessAt(i, keep.join("").trimEnd());
    setLockAtRow(i, nextLocks);

    if (nextLocks.every(Boolean)) {
      if (i + 1 < rows.length) { setLevel(i + 1); setMessage("Nice! Next word →"); }
      else { setMessage("🎉 You solved all the Stepwords!"); }
    } else {
      setMessage("Kept correct letters. Try filling the rest.");
    }
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
        setGuessAt(level, del); setCursor(idx);
      }
      return;
    }
    if (e.key === "ArrowLeft") { e.preventDefault(); stepCursorInRow(-1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); stepCursorInRow(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (level > 0) moveLevel(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (level < rows.length - 1) moveLevel(1); return; }
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); typeChar(e.key); return; }
  }

  function onTextInput(e) {
    const v = e.target.value || "";
    const letters = v.match(/[a-zA-Z]/g);
    if (letters && letters.length) typeChar(letters[letters.length - 1]);
    setIme("");
  }

  return (
    <div className="w-screen min-h-screen overflow-y-auto bg-black pt-3 pb-[22vh]">
      <div className="px-3">
        <div className="text-xs text-gray-400 mb-2">
          {puzzle.date} — by {puzzle.author}, edited by Ben Reich
        </div>
        <div className="mb-3 text-sm text-gray-300">
          <span className="font-semibold">Clue:</span> {clue}
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
          return (
            <div key={i} className="w-full flex flex-row gap-0 px-0">
              <div className="flex gap-0 px-0 mx-0">
                {Array.from({ length: len }).map((_, col) => (
                  <LetterBox
                    key={col}
                    char={showVal[col] || ""}
                    state={locks[i][col] ? "good" : "empty"}
                    isCursor={i === level && col === cursor}
                    onClick={() => {
                      if (!locks[i][col]) { setLevel(i); setCursor(col); inputRef.current?.focus(); }
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
