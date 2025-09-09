export default function GameToolbar({ hintArmed, setHintArmed, stepsRevealed, revealSteps, onShowHowToPlay }) {
  return (
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
          onClick={revealSteps}
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
        <button
          onClick={onShowHowToPlay}
          className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300 hover:bg-gray-900/40"
        >
          How to Play
        </button>
      </div>
    </div>
  );
}
