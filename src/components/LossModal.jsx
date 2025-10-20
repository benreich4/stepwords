import React from "react";

export default function LossModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-4 text-gray-200">
        <div className="text-lg font-semibold mb-2">Out of missteps</div>
        <div className="text-sm mb-4">You ran out of missteps. Better luck tomorrow!</div>
        <div className="flex justify-end gap-2 text-sm">
          <button
            className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={onClose}
          >Close</button>
          <a
            href="/archives"
            className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700"
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


