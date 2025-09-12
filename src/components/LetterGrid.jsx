import LetterBox from "./LetterBox.jsx";

export default function LetterGrid({
  rows,
  guesses,
  lockColors,
  stepIdx,
  stepsRevealed,
  level,
  cursor,
  onTileClick,
}) {
  // Find the longest word length in the puzzle
  const maxWordLength = Math.max(...rows.map(row => row.answer.length));
  return (
    <div className="w-full flex flex-col items-start gap-1 select-none pl-2 pr-0 pb-12">
      {rows.map((r, i) => {
        const len = r.answer.length;
        const showVal = (guesses[i] || "").toUpperCase();
        const stepPos = stepIdx[i]; // -1 for the first row
        return (
          <div key={i} className="w-full flex flex-row gap-0 px-0">
            <div className="flex gap-0 px-0 mx-0">
              {Array.from({ length: len }).map((_, col) => (
                <LetterBox
                  key={col}
                  char={showVal[col] || ""}
                  state={lockColors[i][col]}
                  isCursor={i === level && col === cursor}
                  showStep={i >= 1 && col === stepPos && (stepsRevealed || lockColors[i][stepPos] !== null)}
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
