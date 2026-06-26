import { Link } from "react-router-dom";

export default function QuickIntroModal({ onClose, lightMode = false }) {
  const panel = lightMode ? "border-parchment-200 bg-parchment-50 text-navyink-900" : "border-navyink-700 bg-navyink-850 text-parchment-50";
  const muted = lightMode ? "text-navyink-700/75" : "text-parchment-200/65";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navyink-900/60 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl animate-fade-in-up ${panel}`}>
        <div className="mb-3 flex items-start justify-between">
          <h2 className="font-serif text-xl font-bold">Introducing the Quick Puzzle!</h2>
          <button onClick={onClose} className={`-mr-1 grid h-9 w-9 place-items-center rounded-full ${lightMode ? "text-navyink-700 hover:bg-parchment-100" : "text-parchment-200 hover:bg-navyink-700"}`} aria-label="Close">✕</button>
        </div>
        <p className={`mb-5 text-[15px] leading-relaxed ${muted}`}>
          There's a new Quick Puzzle every day — a shorter, gentler version of the main puzzle, perfect for warming up or getting unstuck.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className={`rounded-full border px-4 py-2 text-sm ${lightMode ? "border-parchment-300 text-navyink-700 hover:bg-parchment-100" : "border-navyink-600 text-parchment-200 hover:bg-navyink-700"}`}>Maybe later</button>
          <Link to="/quick" onClick={onClose} className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${lightMode ? "bg-brand-700 hover:bg-brand-800" : "bg-brand-600 hover:bg-brand-500"}`}>Try today's Quick Puzzle</Link>
        </div>
      </div>
    </div>
  );
}
