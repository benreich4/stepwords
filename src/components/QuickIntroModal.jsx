import { Link } from "react-router-dom";

export default function QuickIntroModal({ onClose, lightMode = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gradient-to-b from-gray-900 to-black'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xl font-semibold ${lightMode ? 'text-gray-900' : 'text-white'}`}>Introducing the Quick Stepword Puzzle!</div>
          <button onClick={onClose} className={`${lightMode ? 'text-gray-600 hover:text-black hover:bg-gray-100' : 'text-gray-400 hover:text-white'} rounded px-2 py-0.5`}>✕</button>
        </div>
        <p className={`text-sm mb-4 ${lightMode ? 'text-gray-700' : 'text-gray-300'}`}>
          There’s a new Quick Stepword puzzle every day. It’s a shorter, gentler version of the main puzzle, perfect for warming up or getting unstuck.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className={`px-3 py-1.5 rounded-md border text-sm ${lightMode ? 'border-gray-300 text-gray-800 hover:bg-gray-100' : 'border-gray-700 text-gray-200 hover:bg-gray-800'}`}>Maybe later</button>
          <Link to="/quick" onClick={onClose} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">Try today’s Quick Stepword Puzzle</Link>
        </div>
      </div>
    </div>
  );
}


