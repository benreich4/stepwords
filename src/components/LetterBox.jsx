export default function LetterBox({
  char = "",
  state = "empty", // "empty" | "good"
  isCursor = false,
  onClick,
}) {
  const base =
    "relative inline-flex items-center justify-center border rounded-[6px] select-none uppercase font-bold leading-none " +
    "w-[6.2vw] aspect-square text-[3.4vw] min-w-[18px] min-h-[18px] " +
    "sm:w-8 sm:text-sm md:w-10 md:text-base";

  const cls =
    state === "good"
      ? "bg-green-600 border-green-500 text-white"
      : "bg-gray-900 border-gray-700 text-gray-200";

  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      <span>{char}</span>
      {isCursor && (
        <span className="pointer-events-none absolute inset-[2px] rounded-[4px] border-2 border-sky-400" />
      )}
    </button>
  );
}
