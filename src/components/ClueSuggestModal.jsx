import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ClueSuggestModal({
  answer,
  clues = [],
  loading = false,
  error = "",
  lightMode = false,
  onSelect,
  onClose,
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const panel = lightMode
    ? "border-parchment-200 bg-parchment-50 text-navyink-900"
    : "border-navyink-700 bg-navyink-850 text-parchment-50";
  const muted = lightMode ? "text-navyink-700/70" : "text-parchment-200/60";
  const optionBtn = lightMode
    ? "border-parchment-200 bg-white hover:bg-parchment-100 text-left"
    : "border-navyink-600 bg-navyink-800 hover:bg-navyink-700 text-left";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-navyink-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Clue suggestions"
        className={`relative z-10 w-full max-w-lg rounded-3xl border p-5 shadow-2xl animate-fade-in-up ${panel}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">Suggest clues</h2>
            <p className={`mt-1 text-sm ${muted}`}>
              For <span className="font-semibold">{answer}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${lightMode ? "text-navyink-700 hover:bg-parchment-100" : "text-parchment-200 hover:bg-navyink-700"}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className={`py-8 text-center text-sm ${muted}`}>Generating clues…</div>
        )}

        {!loading && error && (
          <div className={`rounded-xl border px-3 py-2 text-sm ${lightMode ? "border-red-200 bg-red-50 text-red-800" : "border-red-900/50 bg-red-950/40 text-red-200"}`}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {clues.map((clue, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSelect?.(clue)}
                  className={`press w-full rounded-xl border px-3 py-2.5 text-sm leading-snug transition-colors ${optionBtn}`}
                >
                  {clue}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}
