import LetterBox from "./LetterBox.jsx";

export default function LetterGrid({
  rows,
  guesses,
  lockColors,
  stepIdx,
  hardMode = true,
  level,
  cursor,
  onTileClick,
  onJumpToRow,
  referencedRows,
  diffFromRow = null, // index to compare FROM (longer row)
  diffToRow = null,   // index to compare TO (shorter row)
}) {
  // Find the longest word length in the puzzle
  const maxWordLength = Math.max(...rows.map(row => row.answer.length));
  return (
    <div
      className="w-full flex flex-col items-start gap-1 select-none pl-2 pr-0 pb-0"
      onPointerDown={(e) => {
        if (typeof onJumpToRow !== 'function') return;
        const target = e.target;
        if (!target || !target.closest) return;
        const rowBtn = target.closest('button[aria-label^="Row "]');
        if (!rowBtn) return;
        const label = rowBtn.getAttribute('aria-label') || '';
        const m = label.match(/Row\s+(\d+)/);
        if (!m) return;
        const rowIndex = parseInt(m[1], 10) - 1;
        try {
          if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(rowIndex);
          if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(rowIndex);
        } catch {}
      }}
      onPointerMove={(e) => {
        const target = e.target;
        if (!target || !target.closest) return;
        const rowBtn = target.closest('button[aria-label^="Row "]');
        if (!rowBtn) return;
        const label = rowBtn.getAttribute('aria-label') || '';
        const m = label.match(/Row\s+(\d+)/);
        if (!m) return;
        const rowIndex = parseInt(m[1], 10) - 1;
        try { if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(rowIndex); } catch {}
      }}
      onPointerUp={() => {
        try {
          if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(null);
          if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(null);
        } catch {}
      }}
      onTouchStart={(e) => {
        const rowsFromTouches = [];
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          const el = document.elementFromPoint(t.clientX, t.clientY);
          if (!el || !el.closest) continue;
          const btn = el.closest('button[aria-label^="Row "]');
          if (!btn) continue;
          const label = btn.getAttribute('aria-label') || '';
          const m = label.match(/Row\s+(\d+)/);
          if (m) rowsFromTouches.push(parseInt(m[1], 10) - 1);
        }
        if (rowsFromTouches.length >= 1) {
          try { if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(rowsFromTouches[0]); } catch {}
        }
        if (rowsFromTouches.length >= 2) {
          try { if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(rowsFromTouches[1]); } catch {}
        }
      }}
      onTouchMove={(e) => {
        // keep start; update over to any other touched row
        const touchedRows = new Set();
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          const el = document.elementFromPoint(t.clientX, t.clientY);
          if (!el || !el.closest) continue;
          const btn = el.closest('button[aria-label^="Row "]');
          if (!btn) continue;
          const label = btn.getAttribute('aria-label') || '';
          const m = label.match(/Row\s+(\d+)/);
          if (m) touchedRows.add(parseInt(m[1], 10) - 1);
        }
        if (touchedRows.size >= 2) {
          // pick any second row
          const arr = Array.from(touchedRows);
          try { if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(arr[1]); } catch {}
        }
      }}
      onTouchEnd={(e) => {
        if (e.touches.length === 0) {
          try {
            if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(null);
            if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(null);
          } catch {}
        } else if (e.touches.length === 1) {
          try { if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(null); } catch {}
        }
      }}
    >
      {rows.map((r, i) => {
        const len = r.answer.length;
        const showVal = (guesses[i] || "").toUpperCase();
        const stepPos = stepIdx[i]; // -1 for the first row

        // Diff highlighting:
        // - For FROM row: deemphasize letters that are "extra" vs TO row's answer (multiset diff),
        //   and also deemphasize letters that are already FILLED in the TO row's guess.
        // - For TO row: highlight missing (unfilled) letters.
        let fromExtraMask = null;    // positions in FROM row that are extra relative to TO answer
        let fromFilledMask = null;   // positions in FROM row that correspond to letters already filled in TO guess
        let diffMissingMask = null;  // positions in TO row that are currently unfilled

        const inRange = (idx) => idx != null && idx >= 0 && idx < rows.length;
        if (diffFromRow === i && inRange(diffToRow)) {
          const fromAns = rows[diffFromRow].answer.toUpperCase();
          const toAns = rows[diffToRow].answer.toUpperCase();
          const toGuess = (guesses[diffToRow] || "").toUpperCase();

          const countLetters = (s) => {
            const m = Object.create(null);
            for (const ch of s) { if (ch !== ' ') m[ch] = (m[ch] || 0) + 1; }
            return m;
          };
          const fromCounts = countLetters(fromAns);
          const toCounts = countLetters(toAns);
          const extraCounts = Object.create(null);
          for (const ch in fromCounts) {
            const extra = fromCounts[ch] - (toCounts[ch] || 0);
            if (extra > 0) extraCounts[ch] = extra;
          }
          const filledCounts = countLetters(toGuess);

          fromExtraMask = Array.from({ length: len }, () => false);
          fromFilledMask = Array.from({ length: len }, () => false);
          // First pass: mark extra letters by consuming extraCounts
          for (let c = 0; c < len; c++) {
            const ch = fromAns[c];
            if (extraCounts[ch] > 0) {
              fromExtraMask[c] = true;
              extraCounts[ch] -= 1;
            }
          }
          // Second pass: mark letters that are already filled in TO row (not already extra)
          for (let c = 0; c < len; c++) {
            const ch = fromAns[c];
            if (!fromExtraMask[c] && filledCounts[ch] > 0) {
              fromFilledMask[c] = true;
              filledCounts[ch] -= 1;
            }
          }
        }

        if (diffToRow === i && inRange(diffFromRow)) {
          const targetLen = len;
          const g = (guesses[i] || "").toUpperCase().padEnd(targetLen, " ").slice(0, targetLen);
          diffMissingMask = Array.from({ length: targetLen }, (_, c) => g[c] === " ");
        }
        // deemphasize intermediate step letters when dragging across multiple rows
        // ONLY if that step letter is actually revealed/locked on that row
        const isIntermediateStep = (diffFromRow != null && diffToRow != null && i > diffToRow && i < diffFromRow && stepPos >= 0);
        return (
          <div key={i} className="w-full flex flex-row items-center gap-1 px-0">
            <button
              type="button"
              onClick={() => onJumpToRow && onJumpToRow(i)}
              className={`shrink-0 w-6 h-6 rounded text-[10px] flex items-center justify-center border ${i===level? 'bg-sky-700 border-sky-500 text-white': referencedRows?.has(i) ? 'bg-yellow-700/30 border-yellow-400 text-yellow-200' : 'bg-gray-800 border-gray-700 text-gray-300'}`}
              aria-label={`Row ${i+1}`}
            >
              {i+1}
            </button>
            <div className="flex gap-0 px-0 mx-0">
              {Array.from({ length: len }).map((_, col) => (
                <LetterBox
                  key={col}
                  char={showVal[col] || ""}
                  state={lockColors[i][col]}
                  isCursor={i === level && col === cursor}
                  showStep={i >= 1 && col === stepPos && (hardMode ? lockColors[i][stepPos] !== null : true)}
                  onClick={() => onTileClick(i, col)}
                  maxWordLength={maxWordLength}
                  isDiffExtra={Boolean(fromExtraMask?.[col])}
                  isDiffMissing={Boolean(diffMissingMask?.[col])}
                  isDiffFilled={Boolean(fromFilledMask?.[col]) || (isIntermediateStep && col === stepPos && lockColors[i][stepPos] != null)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
