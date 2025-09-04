import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Game from "../Game.jsx";

export default function PuzzlePage() {
  const { puzzleId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    setData(null);
    fetch(`/puzzles/${puzzleId}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`Puzzle ${puzzleId} not found`);
        return r.json();
      })
      .then(json => {
        setData(json);
        document.title = `Stepword Puzzles – #${json.id}`;
      })
      .catch(e => setErr(e.message));
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
