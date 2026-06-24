import React, { useMemo } from 'react';

/**
 * Autosolve final popup component
 * Shows "Can you solve the last answer?" message and slides down below the last row
 */
export default function AutosolveFinalPopup({
  show,
  moved,
  position,
  lightMode,
  isPartialMode = false,
}) {
  // Memoize popup style to prevent recalculation during transitions
  const popupStyle = useMemo(() => {
    if (moved && position !== null && typeof window !== 'undefined') {
      return { 
        top: `${position}px`,
        transform: 'translateX(-50%)'
      };
    }
    return { 
      top: '50%', 
      transform: 'translate(-50%, -50%)'
    };
  }, [moved, position]);

  if (!show) return null;

  return (
    <>
      {/* Backdrop blur - fades out as modal moves */}
      <div 
        className="fixed inset-0 bg-navyink-900/60 backdrop-blur-sm transition-opacity duration-[1500ms] ease-in-out pointer-events-none z-40"
        style={{ opacity: moved ? 0 : 1 }} 
      />
      <div 
        className="fixed z-50 left-1/2 transition-all duration-[1500ms] ease-in-out will-change-[top,transform]"
        style={popupStyle}
        data-autosolve-complete="true"
      >
        <div className={`${lightMode ? 'bg-parchment-50 text-navyink-900 border-parchment-200' : 'bg-navyink-850 text-parchment-50 border-navyink-700'} relative z-10 w-[90vw] max-w-md rounded-3xl border shadow-2xl`}>
          <div className="p-6">
            {isPartialMode ? (
              <>
                <div className="font-serif text-xl font-bold mb-3">Can you solve the Stepword puzzle?</div>
                <div className={`${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'} text-[15px] leading-relaxed mb-4`}>
                  Leave a comment with the answers, and play daily at{' '}
                  <a href="https://stepwords.xyz" className={`hover:underline ${lightMode ? 'text-brand-700' : 'text-brand-300'}`} target="_blank" rel="noopener noreferrer">
                    https://stepwords.xyz
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="font-serif text-xl font-bold mb-3">Can you solve the last answer?</div>
                <div className={`${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'} text-[15px] leading-relaxed mb-4`}>
                  Check out today's Stepword puzzle at{' '}
                  <a href="https://stepwords.xyz" className={`hover:underline ${lightMode ? 'text-brand-700' : 'text-brand-300'}`} target="_blank" rel="noopener noreferrer">
                    https://stepwords.xyz
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
