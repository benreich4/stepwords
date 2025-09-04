import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [puzzles, setPuzzles] = useState([]);

  useEffect(() => {
    document.title = "Stepword Puzzles";
    fetch("/puzzles/index.json")
      .then(r => r.json())
      .then(setPuzzles)
      .catch(() => setPuzzles([]));
  }, []);

  return (
    <div className="px-3 py-4">
      <h1 className="text-2xl font-bold mb-3">Stepword Puzzles</h1>
      <ul className="space-y-2">
        {puzzles.map(p => (
          <li key={p.id}>
            <Link className="text-sky-400 hover:underline" to={`/${p.id}`}>
              #{p.id} — {p.title || "Untitled"}
            </Link>
          </li>
        ))}
      </ul>
      {!puzzles.length && (
        <div className="text-gray-400 mt-4">No puzzles found.</div>
      )}
    </div>
  );
}
