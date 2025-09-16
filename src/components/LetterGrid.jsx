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
}) {
  // Find the longest word length in the puzzle
  const maxWordLength = Math.max(...rows.map(row => row.answer.length));
  return (
    <div className="w-full flex flex-col items-start gap-1 select-none pl-2 pr-0 pb-0">
      {rows.map((r, i) => {
        const len = r.answer.length;
        const showVal = (guesses[i] || "").toUpperCase();
        const stepPos = stepIdx[i]; // -1 for the first row
        return (
          <div key={i} className="w-full flex flex-row items-center gap-1 px-0">
            <button
              type="button"
              onClick={() => onJumpToRow && onJumpToRow(i)}
              className={`shrink-0 w-6 h-6 rounded text-[10px] flex items-center justify-center border ${i===level? 'bg-sky-700 border-sky-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}
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
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
