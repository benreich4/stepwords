import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { formatShortDate } from "../lib/date.js"

export default function Archives() {
  const [puzzles, setPuzzles] = useState([]);
  const [err, setErr] = useState("");

  // Check if a puzzle is completed
  const isPuzzleCompleted = (puzzleId) => {
    const completedPuzzles = localStorage.getItem('stepwords-completed');
    if (!completedPuzzles) return false;
    
    try {
      const parsed = JSON.parse(completedPuzzles);
      return parsed.includes(puzzleId);
    } catch {
      return false;
    }
  };

  // Check if a puzzle has been started (has saved state)
  const isPuzzleStarted = (puzzleId) => {
    return localStorage.getItem(`stepwords-${puzzleId}`) !== null;
  };

  useEffect(() => {
    document.title = "Stepword Puzzles - Archives";
    fetchManifest()
      .then((list) => {
        // Sort by date desc to show most recent first
        setPuzzles(list.sort((a, b) => new Date(b.date) - new Date(a.date)));
      })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="px-3 py-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">Stepword Puzzles - Archives</h1>
        <Link 
          to="/create" 
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
        >
          Create Puzzle
        </Link>
      </div>
      {err && <div className="text-red-400 mb-2">{err}</div>}
      <ul className="space-y-2">
        {puzzles.map((p) => {
          const completed = isPuzzleCompleted(p.id);
          const started = isPuzzleStarted(p.id);
          
          return (
            <li key={p.id} className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center">
                {completed ? (
                  <span className="text-green-400 text-lg">✓</span>
                ) : started ? (
                  <div className="w-4 h-4 border-2 border-gray-500 rounded"></div>
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-600 rounded"></div>
                )}
              </div>
              <Link className="text-sky-400 hover:underline flex-1" to={`/${p.id}`}>
                #{p.id} — {formatShortDate(p.date) || "Unknown date"} by {p.author || "Unknown"}
              </Link>
            </li>
          );
        })}
      </ul>
      {!puzzles.length && !err && (
        <div className="text-gray-400 mt-4">No puzzles found.</div>
      )}
    </div>
  );
}
