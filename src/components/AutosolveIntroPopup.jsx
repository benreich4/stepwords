import React, { useMemo } from 'react';

/**
 * Autosolve intro popup component
 * Shows "How Stepwords Works" message and slides down below the last solved row
 */
export default function AutosolveIntroPopup({
  show,
  moved,
  position,
  fallbackPosition,
  lightMode,
}) {
  // Memoize popup style to prevent recalculation during transitions
  const popupStyle = useMemo(() => {
    if (moved) {
      const finalPosition = position !== null ? position : (fallbackPosition !== null ? fallbackPosition : null);
      if (finalPosition !== null && typeof window !== 'undefined') {
        // finalPosition is the target top edge position
        // To keep transform consistent, we need to convert to center position
        // The popup is approximately 200px tall, so add half its height
        const popupHeight = 200; // Approximate popup height
        const centerPosition = finalPosition + (popupHeight / 2);
        return { 
          top: `${centerPosition}px`,
          transform: 'translate(-50%, -50%)' // Keep centered transform for smooth transition
        };
      }
    }
    return { 
      top: '50%', 
      transform: 'translate(-50%, -50%)'
    };
  }, [moved, position, fallbackPosition]);

  if (!show) return null;

  return (
    <>
      {/* Backdrop blur - fades out as modal moves */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[1500ms] ease-in-out pointer-events-none z-40"
        style={{ opacity: moved ? 0 : 1 }} 
      />
      <div 
        className="fixed z-50 left-1/2 transition-[top,transform] duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[top,transform]"
        style={popupStyle}
      >
        <div className={`${lightMode ? 'bg-white text-gray-900 border-gray-300' : 'bg-gray-900 text-gray-100 border-gray-700'} relative z-10 w-[90vw] max-w-md rounded-xl border shadow-xl`}>
          <div className="p-6">
            <div className="text-xl font-semibold mb-3">How Stepwords Works</div>
            <div className={`${lightMode ? 'text-gray-700' : 'text-gray-300'} text-sm mb-4 space-y-2`}>
              <p>Each answer is an anagram of the previous answer plus one additional letter.</p>
              <p>Check out daily puzzles at{' '}
                <a href="https://stepwords.xyz" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://stepwords.xyz
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
