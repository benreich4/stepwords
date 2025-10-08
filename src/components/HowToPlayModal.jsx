import { computeStepIndices } from "../lib/gameUtils.js";

export default function HowToPlayModal({ onClose }) {
  const exampleWords = ["SOW", "OWES", "SWORE", "POWERS", "POWDERS", "STEPWORD"];
  const exampleRows = exampleWords.map(w => ({ answer: w }));
  const exampleStepIdx = computeStepIndices(exampleRows);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 px-4 py-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-900 to-black p-6 shadow-2xl my-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="text-2xl font-bold text-white">How to Play</div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4 text-gray-200">
          <p>
            Each answer is an <strong className="text-white">anagram</strong> of the previous answer plus one additional letter. 
          </p>
          
          <p>
            Every clue includes the length of each word in the answer (e.g. <span className="text-gray-400"> Audit (3,2,2)</span> is a clue for <span className="text-gray-400">sit in on</span>).
          </p>
          
          <div className="bg-gray-800 rounded-lg p-4 my-4">
            <div className="text-sm text-gray-400 mb-3">Example puzzle:</div>
            <div className="flex flex-col items-start gap-1">
              {exampleWords.map((word, i) => (
                <div key={i} className="flex gap-0">
                  {word.split("").map((letter, j) => (
                    <div
                      key={j}
                      className="relative inline-flex items-center justify-center border rounded-[6px] select-none uppercase font-bold leading-none w-8 h-8 text-sm bg-green-600 border-green-500 text-white"
                    >
                      <span>{letter}</span>
                      {i >= 1 && j === exampleStepIdx[i] && (
                        <span className="pointer-events-none absolute bottom-[1px] right-[1px] select-none text-[10px] leading-none" aria-hidden>
                          🪜
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-3">
              The 🪜 shows where the new letter was added!
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Correct letters turn <span className="text-green-400">green</span>;  Ones that required multiple guesses or hints turn <span className="text-yellow-400">yellow</span>.</li>
              <li>Submit a row with <strong>Enter</strong> or <strong>Submit</strong>.</li>
              <li><strong>Lifelines</strong>: quick reveals to nudge you forward (each costs 1 point). </li>
              <li><strong>Hard mode</strong>: hides 🪜 step locations by default.</li>
              <li><strong>Easy mode</strong>: filters the on‑screen keyboard.</li>
              <li><strong>Score</strong>: starts at 10. Lose a point for each lifeline and each misstep (a wrong guess when you submit a row). At 0, the next misstep ends the game.</li>
              <li><strong>Stars</strong>: Achieve more stars the fewer missteps and lifelines used. Use too many and you lose the game!</li>
              <li><strong>Quick Stepword</strong>: a shorter daily warm‑up.</li>
            </ul>
          </div>
          <p className="text-gray-400 text-xs">
            Puzzles get a bit harder over the week, and a new one unlocks every night at midnight (ET).
          </p>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md bg-sky-600 text-white font-semibold hover:bg-sky-700"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
