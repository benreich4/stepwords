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
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const [ime, setIme] = useState("");
  // Hint system: arm once, then reveal by tapping any confirmed letter (green)
  const [hintArmed, setHintArmed] = useState(false);
  // Colors now simplified: 'G' for correct, 'Y' for hinted or previously incorrect
  const [wasWrong, setWasWrong] = useState(
    () => rows.map(r => Array(r.answer.length).fill(false))
  );
  // Step reveal: hidden by default; once revealed, cannot be hidden
  const [stepsRevealed, setStepsRevealed] = useState(false);
  // Session stats
  const [hintCount, setHintCount] = useState(0);
  const [guessCount, setGuessCount] = useState(0); // number of submits
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [shareNotice, setShareNotice] = useState("");

  // Share mapping: only green and yellow are used
  const TOKEN_TO_EMOJI = { G: "🟩", Y: "🟨" };

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");

  function buildEmojiShareGridFrom(colorsSnapshot) {
    return rows.map((r, i) => {
      const len = r.answer.length;
      return Array.from({ length: len }, (_, c) => {
        const tok = colorsSnapshot[i]?.[c];
        if (tok === "G") return TOKEN_TO_EMOJI.G;
        if (tok === "Y") return TOKEN_TO_EMOJI.Y;
        return "⬜";
      }).join("");
    }).join("\n");
  }

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

  function isPuzzleSolved(colors, rows) {
    return rows.every((r, i) => (colors[i] || []).every(Boolean));
  }

  // final-row multi-color logic removed

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
    inputRef.current?.focus();
    setMessage("");
  }, [level]);


  const answer = rows[level].answer.toUpperCase();
  const clue = rows[level].clue;

  function setGuessAt(i, next) {
    setGuesses(prev => prev.map((g, idx) => (idx === i ? next : g)));
  }
  function setLockAtRow(i, newLocks) {
    // no-op: explicit locks removed; lockColors indicate blocked cells now
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
        const share = buildEmojiShareGridFrom(colorsAfter);
        setShareText(share);
        setShowShare(true);
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

  // Treat both real locks and hint-reveals as "blocked"
  function isBlocked(rowIndex, colIndex) {
    return isLocked(rowIndex, colIndex);
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
        <div className="ml-auto flex items-center gap-2">
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
                    showStep={stepsRevealed && i >= 1 && col === stepPos}
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
   
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-900 to-black p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xl font-semibold text-white">You solved it!</div>
              {(hintCount === 0 && wrongGuessCount === 0) && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-700 text-white border border-emerald-500">Perfect!</span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                <div className="text-gray-400">Guesses</div>
                <div className="text-lg font-semibold text-gray-100">{guessCount}/{rows.length}</div>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                <div className="text-gray-400">Hints</div>
                <div className="text-lg font-semibold text-gray-100">{hintCount}</div>
              </div>
            </div>

            <pre className="whitespace-pre-wrap text-2xl leading-snug mb-4 p-3 rounded-lg border border-gray-700 bg-gray-900/60">
              {shareText}
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href="https://stepwords.xyz"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-sky-400 hover:underline"
              >
                stepwords.xyz
              </a>
              <div className="flex gap-2 items-center">
                <button
                  onClick={async () => {
                    try {
                      const composed = `I solved today's Stepword Puzzle!\n\n${shareText}\n\nhttps://stepwords.xyz`;
                      await navigator.clipboard.writeText(composed);
                      setShareNotice("Message copied to clipboard");
                    } catch {
                      setShareNotice("Copy failed");
                    }
                  }}
                  className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
                >
                  Share
                </button>
                <button
                  onClick={() => setShowShare(false)}
                  className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-200 text-sm hover:bg-gray-800"
                >
                  Close
                </button>
                {shareNotice && (
                  <span className="text-xs text-emerald-400">{shareNotice}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
