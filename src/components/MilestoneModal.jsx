import { useEffect, useRef, useState } from 'react';

export default function MilestoneModal({ milestone, onClose, lightMode = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const autoTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const handleClose = () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    if (closeTimerRef.current) return; // already closing
    setIsVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300); // wait for fade out
  };

  useEffect(() => {
    setIsVisible(true);
    autoTimerRef.current = setTimeout(handleClose, 4000);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!milestone) return null;

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative px-8 py-6 rounded-2xl shadow-2xl backdrop-blur-md border-2 transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${
          lightMode
            ? 'bg-parchment-50 border-gold-400'
            : 'bg-navyink-850 border-gold-400'
        }`}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full transition-colors ${
            lightMode ? 'text-navyink-700 hover:bg-parchment-100' : 'text-parchment-200 hover:bg-navyink-700'
          }`}
        >
          ✕
        </button>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{milestone.emoji}</div>
          <div
            className={`font-serif text-2xl font-bold mb-2 ${
              lightMode ? 'text-navyink-900' : 'text-parchment-50'
            }`}
          >
            {milestone.message}
          </div>
          <div
            className={`text-sm ${
              lightMode ? 'text-navyink-700/70' : 'text-parchment-200/60'
            }`}
          >
            Achievement unlocked!
          </div>
        </div>
      </div>
    </div>
  );
}
