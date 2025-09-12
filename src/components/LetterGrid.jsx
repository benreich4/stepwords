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
  return (
    <div className="w-full flex flex-col items-start gap-1 select-none px-0 pb-12">
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
                  showStep={stepsRevealed && i >= 1 && col === stepPos}
                  onClick={() => onTileClick(i, col)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
