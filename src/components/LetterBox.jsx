// LetterBox.jsx
const COLOR_CLASSES = {
  G: "bg-green-600 border-green-500 text-white",
  B: "bg-sky-600 border-sky-500 text-white",
  P: "bg-fuchsia-600 border-fuchsia-500 text-white",
  R: "bg-red-600 border-red-500 text-white",
  O: "bg-orange-600 border-orange-500 text-white",
  Y: "bg-yellow-400 border-yellow-400 text-black",
  N: "bg-amber-900 border-amber-800 text-white",
  K: "bg-black border-gray-700 text-gray-100",
  W: "bg-white border-gray-300 text-gray-900",
};
const EMPTY_CLASSES = "bg-gray-900 border-gray-700 text-gray-200";

export default function LetterBox({ char = "", state = null, isCursor = false, onClick }) {
  // `state` is now either null (empty) or a token: 'G'|'B'|'P'|'R'|'O'|'Y'|'N'|'K'|'W'
  const stateClass = state ? COLOR_CLASSES[state] : EMPTY_CLASSES;

  const base =
    "relative inline-flex items-center justify-center border rounded-[6px] " +
    "select-none uppercase font-bold leading-none " +
    "w-[6.2vw] aspect-square text-[3.4vw] min-w-[18px] min-h-[18px] " +
    "sm:w-8 sm:text-sm md:w-10 md:text-base";

  return (
    <button type="button" onClick={onClick} className={`${base} ${stateClass}`}>
      <span>{char}</span>
      {isCursor && (
        <span className="pointer-events-none absolute inset-[2px] rounded-[4px] border-2 border-sky-400" />
      )}
    </button>
  );
}