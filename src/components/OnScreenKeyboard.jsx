export default function OnScreenKeyboard({ onKeyPress, onEnter, onBackspace, disabledKeys = new Set(), filteredLetters = null }) {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['SUBMIT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  const handleKeyClick = (key) => {
    if (key === 'SUBMIT') {
      onEnter();
    } else if (key === 'BACKSPACE') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  const getKeyClass = (key) => {
    const baseClass = "px-2 py-3 rounded font-semibold select-none touch-manipulation";
    
    if (key === 'SUBMIT' || key === 'BACKSPACE') {
      return `${baseClass} bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-700 text-xs`;
    }
    
    const isDisabled = disabledKeys.has(key);
    const isFiltered = filteredLetters && !filteredLetters.includes(key);
    
    return `${baseClass} text-sm ${
      isDisabled 
        ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
        : isFiltered
        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
        : "bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800"
    }`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-gray-900 border-t border-gray-700 z-20">
      {/* Keyboard rows */}
      <div className="px-2 py-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1 mb-1">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => {
                  const isDisabled = disabledKeys.has(key);
                  const isFiltered = filteredLetters && !filteredLetters.includes(key);
                  if (!isDisabled && !isFiltered) {
                    handleKeyClick(key);
                  }
                }}
                disabled={disabledKeys.has(key) || (filteredLetters && !filteredLetters.includes(key))}
                className={getKeyClass(key)}
                style={{
                  minWidth: key === 'SUBMIT' ? '70px' : key === 'BACKSPACE' ? '60px' : '32px',
                  height: '40px'
                }}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
      
      {/* Copyright notice */}
      <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span>© 2025 Stepwords™. All rights reserved.</span>
          <a 
            href="mailto:hello@stepwords.xyz"
            className="text-sky-400 hover:underline"
          >
            hello@stepwords.xyz
          </a>
        </div>
      </div>
    </div>
  );
}
