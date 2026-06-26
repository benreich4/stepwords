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
        className="fixed inset-0 bg-navyink-900/60 backdrop-blur-sm transition-opacity duration-[1500ms] ease-in-out pointer-events-none z-40"
        style={{ opacity: moved ? 0 : 1 }} 
      />
      <div 
        className="fixed z-50 left-1/2 transition-[top,transform] duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[top,transform]"
        style={popupStyle}
      >
        <div className={`${lightMode ? 'bg-parchment-50 text-navyink-900 border-parchment-200' : 'bg-navyink-850 text-parchment-50 border-navyink-700'} relative z-10 w-[90vw] max-w-md rounded-3xl border shadow-2xl`}>
          <div className="p-6">
            <div className="font-serif text-xl font-bold mb-3">How Stepwords Works</div>
            <div className={`${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'} text-[15px] leading-relaxed mb-4 space-y-2`}>
              <p>Each answer is an anagram of the previous answer plus one additional letter.</p>
              <p>Check out daily puzzles at{' '}
                <a href="https://stepwords.xyz" className={`hover:underline ${lightMode ? 'text-brand-700' : 'text-brand-300'}`} target="_blank" rel="noopener noreferrer">
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
