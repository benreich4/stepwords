import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPackById } from "../lib/puzzlePacks.js";
import { fetchOtherManifest } from "../lib/otherPuzzles.js";

function getLightMode() {
  try {
    const s = JSON.parse(localStorage.getItem("stepwords-settings") || "{}");
    return s.lightMode === true;
  } catch {
    return false;
  }
}

export default function PackPage() {
  const { packId } = useParams();
  const [pack, setPack] = useState(null);
  const [manifest, setManifest] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setErr("");
    setPack(null);
    setManifest([]);
    getPackById(packId)
      .then((p) => {
        if (!mounted) return;
        setPack(p);
        document.title = `${p.title} – Stepword Puzzles`;
      })
      .catch((e) => {
        if (mounted) setErr(e.message);
      });
  }, [packId]);

  useEffect(() => {
    if (!pack || pack.puzzleSource !== "other") return;
    fetchOtherManifest()
      .then((list) => setManifest(list))
      .catch(() => {});
  }, [pack]);

  const lightMode = getLightMode();
  const completedIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("otherstep-completed") || "[]"));
    } catch {
      return new Set();
    }
  }, []);

  const puzzleMeta = useMemo(() => {
    if (!pack || !pack.puzzleIds) return [];
    return pack.puzzleIds.map((id) => {
      const meta = manifest.find((p) => String(p.id) === String(id));
      return { id, author: meta?.author, date: meta?.date };
    });
  }, [pack, manifest]);

  if (err) return <div className="px-3 py-4 text-red-400">{err}</div>;
  if (!pack) return <div className="px-3 py-4 text-gray-400">Loading…</div>;

  return (
    <div className="px-3 py-4 max-w-xl mx-auto">
      <div className="mb-4">
        <Link
          to="/packs"
          className={`text-sm ${lightMode ? "text-gray-600 hover:text-gray-800" : "text-gray-400 hover:text-gray-200"}`}
        >
          ← All puzzle packs
        </Link>
      </div>
      <h1 className={`text-xl font-semibold mb-2 ${lightMode ? "text-gray-900" : "text-gray-100"}`}>
        {pack.title}
      </h1>
      {pack.description && (
        <p className={`text-sm mb-6 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
          {pack.description}
        </p>
      )}
      <div className="space-y-2">
        {puzzleMeta.map(({ id, author, date }, idx) => {
          const solved = completedIds.has(String(id));
          const borderCls = lightMode
            ? solved
              ? "border-green-300 bg-green-50 hover:bg-green-100"
              : "border-gray-300 bg-gray-50 hover:bg-gray-100"
            : solved
              ? "border-green-700 bg-green-900/30 hover:bg-green-900/50"
              : "border-gray-700 bg-gray-800/50 hover:bg-gray-800";
          return (
            <Link
              key={id}
              to={`/other/${id}`}
              className={`block px-4 py-3 rounded-lg border transition-colors ${borderCls}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-medium ${lightMode ? "text-gray-900" : "text-gray-100"}`}>
                    Puzzle {idx + 1}
                  </span>
                  {author && (
                    <span className={`ml-2 text-xs ${lightMode ? "text-gray-500" : "text-gray-400"}`}>
                      by <Link to={`/author/${encodeURIComponent(author)}`} onClick={(e) => e.stopPropagation()} className={`underline hover:no-underline ${lightMode ? "text-gray-600 hover:text-gray-800" : "text-gray-400 hover:text-gray-200"}`}>{author}</Link>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {solved && (
                    <span className="text-green-500 text-sm" title="Completed">
                      ✓
                    </span>
                  )}
                  <span className={`text-xs ${lightMode ? "text-gray-400" : "text-gray-500"}`}>
                    →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
