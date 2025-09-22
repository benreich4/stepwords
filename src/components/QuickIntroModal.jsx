import { Link } from "react-router-dom";

export default function QuickIntroModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-900 to-black p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold text-white">Introducing the Quick Stepword Puzzle!</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <p className="text-sm text-gray-300 mb-4">
          There’s a new Quick Stepword puzzle every day. It’s a shorter, gentler version of the main puzzle, perfect for warming up or getting unstuck.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-200 text-sm hover:bg-gray-800">Maybe later</button>
          <Link to="/quick" onClick={onClose} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">Try today’s Quick Stepword Puzzle</Link>
        </div>
      </div>
    </div>
  );
}


