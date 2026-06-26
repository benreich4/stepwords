import React from "react";

export default function LossModal({ show, onClose, lightMode = false }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navyink-900/60 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl animate-fade-in-up ${lightMode ? 'border-parchment-200 bg-parchment-50 text-navyink-900' : 'border-navyink-700 bg-navyink-850 text-parchment-50'}`}>
        <div className="font-serif text-lg font-bold mb-2">Out of missteps</div>
        <div className={`text-sm mb-5 ${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'}`}>You ran out of missteps. Better luck tomorrow!</div>
        <div className="flex justify-end gap-2 text-sm">
          <button
            className={`px-4 py-2 rounded-full border ${lightMode ? 'border-parchment-300 text-navyink-700 hover:bg-parchment-100' : 'border-navyink-600 text-parchment-200 hover:bg-navyink-700'}`}
            onClick={onClose}
          >Close</button>
          <a
            href="/archives"
            className={`px-4 py-2 rounded-full font-semibold text-white shadow-sm transition-colors ${lightMode ? 'bg-brand-700 hover:bg-brand-800' : 'bg-brand-600 hover:bg-brand-500'}`}
            onClick={(e) => {
              try { e.preventDefault(); window.history.pushState({}, "", "/archives"); } catch {}
              onClose?.();
            }}
          >Go to Archives</a>
        </div>
      </div>
    </div>
  );
}


