import LetterBox from "./LetterBox.jsx";
import { useRef } from "react";

export default function LetterGrid({
  rows,
  guesses,
  lockColors,
  stepIdx,
  hardMode = true,
  lightMode = false,
  level,
  cursor,
  onTileClick,
  onJumpToRow,
  referencedRows,
  diffFromRow = null, // index to compare FROM (longer row)
  diffToRow = null,   // index to compare TO (shorter row)
}) {
  // Long-press tracking for mobile/desktop: start diff after hold on row number
  const longPressTimerRef = useRef(null);
  const longPressActiveRef = useRef(false);
  const longPressStartRowRef = useRef(null);
  const prevBodyOverflowRef = useRef("");
  const prevBodyTouchActionRef = useRef("");
  const prevBodyUserSelectRef = useRef("");
  const prevBodyPositionRef = useRef("");
  const prevBodyTopRef = useRef("");
  const prevScrollYRef = useRef(0);
  const activePointerIdRef = useRef(null);
  const unblockHandlersRef = useRef({});
  // Find the longest word length in the puzzle
  const maxWordLength = Math.max(...rows.map(row => row.answer.length));
  const isHoldingOnly = longPressActiveRef.current && longPressStartRowRef.current != null && (typeof diffToRow !== 'number' || diffToRow == null);
  return (
    <div
      className="w-full flex flex-col items-start gap-1 select-none pl-2 pr-0 pb-0"
      onPointerDown={(e) => {
        const target = e.target;
        if (!target || !target.closest) return;
        const rowBtn = target.closest('button[aria-label^="Row "]');
        if (!rowBtn) return;
        const label = rowBtn.getAttribute('aria-label') || '';
        const m = label.match(/Row\s+(\d+)/);
        if (!m) return;
        const rowIndex = parseInt(m[1], 10) - 1;
        longPressStartRowRef.current = rowIndex;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressActiveRef.current = false;
        activePointerIdRef.current = e.pointerId;
        try { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); } catch {}
        longPressTimerRef.current = setTimeout(() => {
          longPressActiveRef.current = true;
          try {
            if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(rowIndex);
            if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(rowIndex);
          } catch {}
          // Disable page scroll/selection while in compare mode
          try {
            // Freeze body scroll via position:fixed to avoid iOS scrolling
            prevScrollYRef.current = window.scrollY || 0;
            prevBodyOverflowRef.current = document.body.style.overflow;
            prevBodyTouchActionRef.current = document.body.style.touchAction;
            prevBodyUserSelectRef.current = document.body.style.userSelect;
            prevBodyPositionRef.current = document.body.style.position;
            prevBodyTopRef.current = document.body.style.top;
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            document.body.style.userSelect = 'none';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${prevScrollYRef.current}px`;
          } catch {}
          // Additionally block touchmove/wheel globally (iOS/Safari edge cases)
          try {
            const block = (ev) => { ev.preventDefault(); };
            window.addEventListener('touchmove', block, { passive: false });
            window.addEventListener('wheel', block, { passive: false });
            unblockHandlersRef.current = { block };
          } catch {}
        }, 300);
      }}
      onPointerMove={(e) => {
        if (!longPressActiveRef.current) return;
        try {
          e.preventDefault();
          const scroller = document.getElementById('grid-scroll');
          if (scroller) {
            scroller.style.overflowY = 'hidden';
            scroller.style.touchAction = 'none';
          }
        } catch {}
        // Determine row under pointer by Y coordinate using row containers
        const y = e.clientY;
        try {
          const containers = e.currentTarget.querySelectorAll('[data-row-index]');
          let hit = null;
          containers.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (y >= rect.top && y <= rect.bottom) {
              const idx = parseInt(el.getAttribute('data-row-index'), 10);
              hit = Number.isFinite(idx) ? idx : hit;
            }
          });
          if (hit != null) {
            if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(hit);
          }
        } catch {}
      }}
      onPointerUp={() => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
        if (longPressActiveRef.current) {
          try {
            if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(null);
            if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(null);
          } catch {}
          // Restore page/scroll/selection
          try {
            document.body.style.overflow = prevBodyOverflowRef.current || '';
            document.body.style.touchAction = prevBodyTouchActionRef.current || '';
            document.body.style.userSelect = prevBodyUserSelectRef.current || '';
            document.body.style.position = prevBodyPositionRef.current || '';
            document.body.style.top = prevBodyTopRef.current || '';
            window.scrollTo(0, prevScrollYRef.current || 0);
            const scroller = document.getElementById('grid-scroll');
            if (scroller) { scroller.style.overflowY = ''; scroller.style.touchAction = ''; }
            if (unblockHandlersRef.current.block) {
              window.removeEventListener('touchmove', unblockHandlersRef.current.block);
              window.removeEventListener('wheel', unblockHandlersRef.current.block);
              unblockHandlersRef.current = {};
            }
          } catch {}
        }
        longPressActiveRef.current = false;
        longPressStartRowRef.current = null;
        try { if (activePointerIdRef.current != null && e.currentTarget.releasePointerCapture) e.currentTarget.releasePointerCapture(activePointerIdRef.current); } catch {}
        activePointerIdRef.current = null;
      }}
      onPointerCancel={() => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
        if (longPressActiveRef.current) {
          try {
            if (typeof window.__setDragStartRow === 'function') window.__setDragStartRow(null);
            if (typeof window.__setDragOverRow === 'function') window.__setDragOverRow(null);
          } catch {}
          try {
            document.body.style.overflow = prevBodyOverflowRef.current || '';
            document.body.style.touchAction = prevBodyTouchActionRef.current || '';
            document.body.style.userSelect = prevBodyUserSelectRef.current || '';
            document.body.style.position = prevBodyPositionRef.current || '';
            document.body.style.top = prevBodyTopRef.current || '';
            window.scrollTo(0, prevScrollYRef.current || 0);
            const scroller = document.getElementById('grid-scroll');
            if (scroller) { scroller.style.overflowY = ''; scroller.style.touchAction = ''; }
            if (unblockHandlersRef.current.block) {
              window.removeEventListener('touchmove', unblockHandlersRef.current.block);
              window.removeEventListener('wheel', unblockHandlersRef.current.block);
              unblockHandlersRef.current = {};
            }
          } catch {}
        }
        longPressActiveRef.current = false;
        longPressStartRowRef.current = null;
      }}
      // Multi-touch logic removed; long-press initiates diff instead
    >
      {rows.map((r, i) => {
        const len = r.answer.length;
        const showVal = (guesses[i] || "").toUpperCase();
        const stepPos = stepIdx[i]; // -1 for the first row

        // Diff highlighting rules:
        // - Always deemphasize the step letter of the FROM row (true extra vs row-1).
        // - If comparing to the immediate previous row (gap === 1): also
        //   deemphasize characters in FROM that are already filled in the TO row's guess (multiset match).
        // - If comparing across multiple rows (gap > 1): only deemphasize
        //   the FROM row's step letter and any intermediate step letters that are revealed/locked.
        //   Ignore the TO row's answer/guess to avoid over-deemphasis when middle rows are unknown.

        let fromExtraMask = null;    // positions in FROM row that are extra or accounted for by known steps
        let fromFilledMask = null;   // positions in FROM row matched by filled letters in immediate TO row (gap === 1 only)
        let diffMissingMask = null;  // (unused visual now; kept for future)

        const inRange = (idx) => idx != null && idx >= 0 && idx < rows.length;
        if (diffFromRow === i && inRange(diffToRow)) {
          const fromAns = rows[diffFromRow].answer.toUpperCase();
          const gap = Math.abs(diffFromRow - diffToRow);
          const backward = diffToRow < diffFromRow;  // comparing to previous words
          const forward = diffToRow > diffFromRow;   // comparing to future words

          fromExtraMask = Array.from({ length: len }, () => false);
          fromFilledMask = Array.from({ length: len }, () => false);

          // Step letter handling depends on direction
          // - Backward (to earlier rows): step letter is truly extra vs previous, so fade it
          // - Forward (to later rows): do NOT fade step letter unless covered by overlaps below
          if (backward && stepPos >= 0 && stepPos < len) {
            fromExtraMask[stepPos] = true;
          }

          // Build overlap counts from TO row's current guess (only what user has entered)
          const countsOverlap = Object.create(null);
          const toGuess = (guesses[diffToRow] || "").toUpperCase();
          for (const ch of toGuess) { if (ch !== ' ') countsOverlap[ch] = (countsOverlap[ch] || 0) + 1; }

          // For backward gap > 1, also account for revealed intermediate step letters
          if (backward && gap > 1) {
            for (let k = diffToRow + 1; k < diffFromRow; k++) {
              const sIdx = stepIdx[k];
              if (sIdx >= 0 && lockColors[k] && lockColors[k][sIdx] != null) {
                const ch = rows[k].answer.toUpperCase()[sIdx];
                if (ch && ch !== ' ') countsOverlap[ch] = (countsOverlap[ch] || 0) + 1;
              }
            }
          }

          // Do not pre-consume the overlap for the step letter.
          // This allows cases like APPRECIATE (step E) vs PER to dim two Es: one for step, one for overlap.

          // Deemphasize any letters in FROM that are covered by countsOverlap (multiset-aware)
          for (let c = 0; c < len; c++) {
            const ch = fromAns[c];
            if (fromExtraMask[c]) continue; // step already handled
            if (countsOverlap[ch] > 0) {
              fromFilledMask[c] = true;
              countsOverlap[ch] -= 1;
            }
          }
        }

        // No special treatment for TO row visuals (we removed yellow); keep for future if needed
        // deemphasize intermediate step letters when dragging across multiple rows
        // ONLY if that step letter is actually revealed/locked on that row
        const isIntermediateStep = (diffFromRow != null && diffToRow != null && i > diffToRow && i < diffFromRow && stepPos >= 0);
        return (
          <div key={i} data-row-index={i} className="w-full flex flex-row items-center gap-1 px-0">
            <button
              type="button"
              onClick={() => onJumpToRow && onJumpToRow(i)}
              className={`shrink-0 w-6 h-6 rounded text-[10px] flex items-center justify-center border ${
                i===level
                  ? (lightMode ? 'bg-sky-100 border-sky-300 text-sky-900' : 'bg-sky-700 border-sky-500 text-white')
                  : referencedRows?.has(i)
                    ? (lightMode ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-yellow-700/30 border-yellow-400 text-yellow-200')
                    : (lightMode ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300')
              }`}
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
                  isDiffAll={isHoldingOnly && longPressStartRowRef.current === i}
                  delayMs={col * 28}
                  lightMode={lightMode}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
