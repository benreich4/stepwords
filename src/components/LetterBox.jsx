import { getTodayIsoInET } from "../lib/date.js";

export default function LetterBox({
  char = "",
  state = null,          // null or 'G' | 'Y'
  isCursor = false,
  onClick,
  showStep = false,      // <-- NEW
  maxWordLength = 7,     // <-- NEW: longest word in puzzle
  isDiffExtra = false,   // highlight as the extra/step letter vs comparison row
  isDiffMissing = false, // highlight as a missing/unfilled letter in comparison row
  isDiffFilled = false,  // deemphasize letters already filled in comparison row
  isDiffAll = false,     // deemphasize entire row (initial hold before selecting target)
  lightMode = false,
}) {
  const COLOR_CLASSES = {
    G: "bg-green-600 border-green-500 text-white",
    Y: "bg-yellow-400 border-yellow-400 text-black",
  };
  const EMPTY_CLASSES = lightMode ? "bg-gray-100 border-gray-300 text-gray-900" : "bg-gray-900 border-gray-700 text-gray-200";
  const stateClass = state ? (COLOR_CLASSES[state] || EMPTY_CLASSES) : EMPTY_CLASSES;

  // Calculate dynamic tile size based on viewport and word length, with sane min/max caps
  // - Slightly reduce available width to account for borders/padding so no overflow on mobile
  // - Mobile: ensure tiles aren't too small (min ~30px)
  // - Desktop: cap tiles so they don't get huge (max ~40px)
  const rawSize = `(100vw - 3rem) / ${maxWordLength}`;
  const tileSize = `clamp(30px, calc(${rawSize}), 40px)`;
  const textSize = `clamp(11px, calc(${rawSize} * 0.42), 16px)`;
  
  const base =
    "relative inline-flex items-center justify-center border rounded-[6px] box-border " +
    "select-none uppercase font-bold leading-none " +
    "aspect-square";
  const hasChar = Boolean(char && char !== " ");
  const getStepEmoji = () => {
    try {
      const iso = getTodayIsoInET();
      const parts = (iso || "").split('-').map((v) => parseInt(v, 10));
      const month = parts[1];
      const day = parts[2];
      if (month === 10 && day >= 28 && day <= 31) return '🎃';
    } catch {}
    return '🪜';
  };

  return (
    <button 
      type="button" 
      onClick={onClick} 
      className={`${base} ${stateClass} ${(isDiffAll || (hasChar && (isDiffExtra || isDiffFilled))) ? 'opacity-60' : ''}`}
      style={{
        width: tileSize,
        fontSize: textSize,
      }}
    >
      <span>{char}</span>

      {/* Cursor highlight stays inside the box */}
      {isCursor && (
        <span className="pointer-events-none absolute inset-[2px] rounded-[4px] border-2 border-sky-400" />
      )}

      {/* 🪜 Step badge (always visible for step squares, per your request) */}
      {showStep && (
        <span
          className="pointer-events-none absolute bottom-[1px] right-[1px] select-none
                     text-[8px] sm:text-[10px] md:text-[11px] leading-none"
          aria-hidden
        >
          {getStepEmoji()}
        </span>
      )}
    </button>
  );
}
