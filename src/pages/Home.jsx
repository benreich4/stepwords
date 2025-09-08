import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { formatLongDate } from "../lib/date.js"

export default function Home() {
  const [puzzles, setPuzzles] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Stepword Puzzles";
    fetchManifest()
      .then((list) => {
        // optional: sort by date desc if you like
        setPuzzles(list);
      })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="px-3 py-4">
      <h1 className="text-2xl font-bold mb-3">Stepword Puzzles</h1>
      {err && <div className="text-red-400 mb-2">{err}</div>}
      <ul className="space-y-2">
        {puzzles.map((p) => (
          <li key={p.id}>
            <Link className="text-sky-400 hover:underline" to={`/${p.id}`}>
              #{p.id} — {formatLongDate(p.date) || "Unknown date"} by {p.author || "Unknown"}
            </Link>
          </li>
        ))}
      </ul>
      {!puzzles.length && !err && (
        <div className="text-gray-400 mt-4">No puzzles found.</div>
      )}
    </div>
  );
}