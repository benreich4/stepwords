export default function HowToPlayModal({ onClose }) {
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
              {["ROW", "OWES", "SWORE", "POWERS", "POWDERS", "STEPWORD"].map((word, i) => (
                <div key={i} className="flex gap-0">
                  {word.split("").map((letter, j) => (
                    <div
                      key={j}
                      className="relative inline-flex items-center justify-center border rounded-[6px] select-none uppercase font-bold leading-none w-8 h-8 text-sm bg-green-600 border-green-500 text-white"
                    >
                      <span>{letter}</span>
                      {i >= 1 && j === word.length - 1 && (
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
              <li>Correct letters turn <span className="text-green-400">green</span></li>
              <li>Letters that took multiple guesses or required a hint turn <span className="text-yellow-400">yellow</span></li>
              <li>Use <strong className="text-sky-400">Hints</strong> for help:
                <ul className="list-disc list-inside space-y-1 ml-4 mt-1">
                  <li><strong className="text-amber-400">Step locations</strong> - Show 🪜 icons</li>
                  <li><strong className="text-blue-400">First letters</strong> - Reveal starting letters</li>
                  <li><strong className="text-purple-400">Filter keyboard</strong> - Hide unused letters</li>
                  <li><strong className="text-green-400">Step letters</strong> - Show new letters added</li>
                </ul>
              </li>
            </ul>
          </div>
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
