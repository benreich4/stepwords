import React, { useEffect, useRef, useState } from "react";
import LetterGrid from "./components/LetterGrid.jsx";
import GameToolbar from "./components/GameToolbar.jsx";
import ShareModal from "./components/ShareModal.jsx";
import { formatLongDate } from "./lib/date.js";
import { buildEmojiShareGridFrom, computeStepIndices, isPuzzleSolved } from "./lib/gameUtils.js";
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

  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState("");
  

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
      <GameToolbar
        hintArmed={hintArmed}
        setHintArmed={setHintArmed}
        stepsRevealed={stepsRevealed}
        revealSteps={() => setStepsRevealed(true)}
      />

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
            inputRef.current?.focus();
          }
        }}
      />

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
        <ShareModal
          shareText={shareText}
          hintCount={hintCount}
          wrongGuessCount={wrongGuessCount}
          guessCount={guessCount}
          rowsLength={rows.length}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
