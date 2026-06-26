import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function RatingIntroPopup({ onClose, lightMode = false }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navyink-900/60 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl animate-fade-in-up ${lightMode ? 'border-parchment-200 bg-parchment-50' : 'border-navyink-700 bg-navyink-850'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`font-serif text-xl font-bold flex items-center gap-2 ${lightMode ? 'text-navyink-900' : 'text-parchment-50'}`}>
            <span className="text-2xl">❤️</span> Heart ratings are here!
          </div>
          <button
            onClick={onClose}
            className={`${lightMode ? 'text-navyink-700 hover:bg-parchment-100' : 'text-parchment-200 hover:bg-navyink-700'} grid h-9 w-9 place-items-center rounded-full`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className={`text-[15px] leading-relaxed mb-4 ${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'}`}>
          You can now rate each puzzle 1–5 hearts after completing it. Your ratings help us find the best puzzles and improve the experience for everyone.
        </p>
        <p className={`text-[15px] leading-relaxed mb-4 ${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'}`}>
          <strong>Already completed some puzzles?</strong>{' '}
          <Link
            to="/archives"
            onClick={onClose}
            className={`font-semibold underline ${lightMode ? 'text-emerald-700 hover:text-emerald-800' : 'text-emerald-400 hover:text-emerald-300'}`}
          >
            Visit the archives
          </Link>
          {' '}to rate your favorites and help surface the best puzzles for others.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-full text-sm font-semibold text-white shadow-sm transition-colors ${lightMode ? 'bg-brand-700 hover:bg-brand-800' : 'bg-brand-600 hover:bg-brand-500'}`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
