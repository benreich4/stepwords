import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Game from "../Game.jsx";
import { loadPuzzleById } from "../lib/puzzles.js";
import { formatDateWithDayOfWeek } from "../lib/date.js";

export default function PuzzlePage() {
  const { puzzleId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setErr("");
    setData(null);

    loadPuzzleById(puzzleId)
      .then((json) => {
        if (!mounted) return;
        setData(json);
        const dateStr = json.date ? formatDateWithDayOfWeek(json.date) : "";
        document.title = `Stepword Puzzle – #${json.id}${dateStr ? ` (${dateStr})` : ""}`;
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e.message);
      });

    return () => { mounted = false; };
  }, [puzzleId]);

  if (err) {
    return (
      <div className="px-3 py-4">
        <div className="text-red-400 mb-2">{err}</div>
        <Link to="/" className="text-sky-400 hover:underline">← Back to list</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="px-3 py-4 text-gray-400">Loading…</div>;
  }

  return <Game puzzle={data} />;
}