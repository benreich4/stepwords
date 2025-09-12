export default function LetterBox({
  char = "",
  state = null,          // null or 'G' | 'Y'
  isCursor = false,
  onClick,
  showStep = false,      // <-- NEW
}) {
  const COLOR_CLASSES = {
    G: "bg-green-600 border-green-500 text-white",
    Y: "bg-yellow-400 border-yellow-400 text-black",
  };
  const EMPTY_CLASSES = "bg-gray-900 border-gray-700 text-gray-200";
  const stateClass = state ? (COLOR_CLASSES[state] || EMPTY_CLASSES) : EMPTY_CLASSES;

  const base =
    "relative inline-flex items-center justify-center border rounded-[6px] " +
    "select-none uppercase font-bold leading-none " +
    "w-[6vw] aspect-square text-[3vw] min-w-[18px] min-h-[18px] max-w-[32px] max-h-[32px] " +
    "sm:w-8 sm:text-sm md:w-10 md:h-10 md:text-base";

  return (
    <button type="button" onClick={onClick} className={`${base} ${stateClass}`}>
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
          🪜
        </span>
      )}
    </button>
  );
}
