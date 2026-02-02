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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[1500ms] ease-in-out pointer-events-none z-40"
        style={{ opacity: moved ? 0 : 1 }} 
      />
      <div 
        className="fixed z-50 left-1/2 transition-all duration-[1500ms] ease-in-out will-change-[top,transform]"
        style={popupStyle}
      >
        <div className={`${lightMode ? 'bg-white text-gray-900 border-gray-300' : 'bg-gray-900 text-gray-100 border-gray-700'} relative z-10 w-[90vw] max-w-md rounded-xl border shadow-xl`}>
          <div className="p-6">
            <div className="text-xl font-semibold mb-3">Can you solve the last answer?</div>
            <div className={`${lightMode ? 'text-gray-700' : 'text-gray-300'} text-sm mb-4`}>
              Check out today's Stepword puzzle at{' '}
              <a href="https://stepwords.xyz" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                https://stepwords.xyz
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
