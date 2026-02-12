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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xl font-semibold flex items-center gap-2 ${lightMode ? 'text-gray-900' : 'text-white'}`}>
            <span className="text-2xl">★</span> Star ratings are here!
          </div>
          <button
            onClick={onClose}
            className={`${lightMode ? 'text-gray-600 hover:text-black hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-gray-800'} rounded px-2 py-0.5`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className={`text-sm mb-4 ${lightMode ? 'text-gray-700' : 'text-gray-300'}`}>
          You can now rate each puzzle 1–5 stars after completing it. Your ratings help us find the best puzzles and improve the experience for everyone.
        </p>
        <p className={`text-sm mb-4 ${lightMode ? 'text-gray-700' : 'text-gray-300'}`}>
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
            className="px-4 py-2 rounded-md text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/30 transition-all duration-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
