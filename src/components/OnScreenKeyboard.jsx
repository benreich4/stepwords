export default function OnScreenKeyboard({ onKeyPress, onEnter, onBackspace, disabledKeys = new Set() }) {
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
    return `${baseClass} text-sm ${
      isDisabled 
        ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
        : "bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800"
    }`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full px-2 py-3 bg-gray-900 border-t border-gray-700 z-20">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 mb-1">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => !disabledKeys.has(key) && handleKeyClick(key)}
              disabled={disabledKeys.has(key)}
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
  );
}
