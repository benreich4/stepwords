import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPacks } from "../lib/puzzlePacks.js";

function getLightMode() {
  try {
    const s = JSON.parse(localStorage.getItem("stepwords-settings") || "{}");
    return s.lightMode === true;
  } catch {
    return false;
  }
}

export default function PacksPage() {
  const [packs, setPacks] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Puzzle Packs – Stepword Puzzles";
    fetchPacks()
      .then((list) => setPacks(Array.isArray(list) ? list : []))
      .catch((e) => setErr(e.message));
  }, []);

  const lightMode = getLightMode();

  if (err) return <div className="px-3 py-4 text-red-400">{err}</div>;

  return (
    <div className="px-3 py-4 max-w-xl mx-auto">
      <h1 className={`text-xl font-semibold mb-2 ${lightMode ? "text-gray-900" : "text-gray-100"}`}>
        Puzzle Packs
      </h1>
      <p className={`text-sm mb-6 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
        Curated collections of stepword puzzles grouped by theme or event.
      </p>
      {!packs.length && !err && (
        <div className={lightMode ? "text-gray-500" : "text-gray-400"}>No puzzle packs yet.</div>
      )}
      <div className="space-y-3">
        {packs.map((pack) => (
          <Link
            key={pack.id}
            to={`/packs/${pack.id}`}
            className={`block px-4 py-3 rounded-lg border transition-colors ${
              lightMode
                ? "border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900"
                : "border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-100"
            }`}
          >
            <div className="font-medium">{pack.title}</div>
            {pack.description && (
              <div className={`text-sm mt-1 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
                {pack.description}
              </div>
            )}
            <div className={`text-xs mt-2 ${lightMode ? "text-gray-500" : "text-gray-500"}`}>
              {pack.puzzleIds?.length || 0} puzzles →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
