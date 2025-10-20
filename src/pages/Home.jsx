import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest, loadPuzzleById } from "../lib/puzzles.js";
import { getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";
import Game from "../Game.jsx";

export default function Home() {
  const [puzzle, setPuzzle] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState({ prevId: null, nextId: null });

  useEffect(() => {
    document.title = "Stepword Puzzles";
    
    fetchManifest()
      .then((list) => {
        if (list.length === 0) {
          setErr("No puzzles available");
          setLoading(false);
          return;
        }
        
        // Only allow puzzles with date <= today (Eastern Time)
        const todayET = getTodayIsoInET();
        const preview = isPreviewEnabled();
        // Always load today's puzzle on Home. Preview mode does not advance Home beyond today.
        const available = list.filter(p => p.date <= todayET);
        if (available.length === 0) {
          setErr("No puzzles available yet today");
          setLoading(false);
          return;
        }
        // Sort by date desc among available
        const sortedPuzzles = available.sort((a, b) => (a.date < b.date ? 1 : -1));
        const mostRecent = sortedPuzzles[0];

        // Compute prev/next ids within availability (same logic as PuzzlePage)
        const idx = list.findIndex((p) => String(p.id) === String(mostRecent.id));
        let prevId = null, nextId = null;
        if (idx > 0) {
          const prev = list[idx - 1];
          if (prev && (preview || prev.date <= todayET)) prevId = String(prev.id);
        }
        if (idx >= 0 && idx + 1 < list.length) {
          const next = list[idx + 1];
          if (next && (preview || next.date <= todayET)) nextId = String(next.id);
        }
        setNav({ prevId, nextId });
        
        // Load the most recent puzzle
        return loadPuzzleById(mostRecent.id);
      })
      .then((puzzleData) => {
        if (puzzleData) {
          setPuzzle(puzzleData);
          // Set document title with day of week
          const [y,m,d] = puzzleData.date.split('-').map((v)=>parseInt(v,10));
          const date = new Date(y, m-1, d);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
          document.title = `Stepword Puzzle – ${dayOfWeek}, ${puzzleData.date}`;
        }
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="px-3 py-4 text-gray-400">Loading most recent puzzle…</div>;
  }

  if (err) {
    return (
      <div className="px-3 py-4">
        <div className="text-red-400 mb-2">{err}</div>
        <Link to="/archives" className="text-sky-400 hover:underline">← View Archives</Link>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="px-3 py-4">
        <div className="text-gray-400 mb-2">No puzzles available</div>
        <Link to="/archives" className="text-sky-400 hover:underline">← View Archives</Link>
      </div>
    );
  }

  return <Game puzzle={puzzle} prevId={nav.prevId} nextId={nav.nextId} />;
}