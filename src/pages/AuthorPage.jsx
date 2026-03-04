import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { shouldSendAnalytics } from "../lib/autosolveUtils.js";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { fetchOtherManifest } from "../lib/otherPuzzles.js";
import { getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";
import { formatDateWithDayOfWeek } from "../lib/date.js";

function getLightMode() {
  try {
    const s = JSON.parse(localStorage.getItem("stepwords-settings") || "{}");
    return s.lightMode === true;
  } catch {
    return false;
  }
}

export default function AuthorPage() {
  const { authorName } = useParams();
  const author = authorName ? decodeURIComponent(authorName) : "";
  const [mainManifest, setMainManifest] = useState([]);
  const [quickManifest, setQuickManifest] = useState([]);
  const [otherManifest, setOtherManifest] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = author ? `Puzzles by ${author} – Stepwords` : "Author – Stepwords";
  }, [author]);

  useEffect(() => {
    if (author && shouldSendAnalytics() && window.gtag && typeof window.gtag === "function") {
      window.gtag("event", "author_page_viewed", { author });
    }
  }, [author]);

  useEffect(() => {
    let mounted = true;
    setErr("");
    Promise.all([
      fetchManifest().catch((e) => (mounted ? setErr(e.message) : null, [])),
      fetchQuickManifest().catch(() => []),
      fetchOtherManifest().catch(() => []),
    ]).then(([main, quick, other]) => {
      if (!mounted) return;
      setMainManifest(main || []);
      setQuickManifest(quick || []);
      setOtherManifest(other || []);
    });
    return () => { mounted = false; };
  }, []);

  const completedIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("stepwords-completed") || "[]"));
    } catch {
      return new Set();
    }
  }, []);
  const quickCompletedIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("quickstep-completed") || "[]"));
    } catch {
      return new Set();
    }
  }, []);
  const otherCompletedIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("otherstep-completed") || "[]"));
    } catch {
      return new Set();
    }
  }, []);

  const { mainPuzzles, quickPuzzles, otherPuzzles } = useMemo(() => {
    if (!author) return { mainPuzzles: [], quickPuzzles: [], otherPuzzles: [] };
    const todayET = getTodayIsoInET();
    const preview = isPreviewEnabled();
    const byAuthor = (p) => (p?.author || "").trim() === author.trim();
    const available = (p) => preview || !p.date || p.date <= todayET;

    const main = (mainManifest || []).filter(byAuthor).filter(available);
    const quick = (quickManifest || []).filter(byAuthor).filter(available);
    const other = (otherManifest || []).filter(byAuthor).filter(available);

    return {
      mainPuzzles: main.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      quickPuzzles: quick.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      otherPuzzles: other.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    };
  }, [author, mainManifest, quickManifest, otherManifest]);

  const lightMode = getLightMode();
  const totalCount = mainPuzzles.length + quickPuzzles.length + otherPuzzles.length;

  const puzzleLink = (puzzle, type) => {
    if (type === "main") return `/${puzzle.id}`;
    if (type === "quick") return `/quick/${puzzle.id}`;
    return `/other/${puzzle.id}`;
  };

  const isSolved = (puzzle, type) => {
    if (type === "main") return completedIds.has(String(puzzle.id));
    if (type === "quick") return quickCompletedIds.has(String(puzzle.id));
    return otherCompletedIds.has(String(puzzle.id));
  };

  const INITIAL_SHOW = 5;

  const PuzzleList = ({ puzzles, type, title }) => {
    const [expanded, setExpanded] = useState(false);
    if (!puzzles.length) {
      return (
        <div className={`rounded-lg border p-3 ${lightMode ? "border-gray-300 bg-gray-50/50" : "border-gray-700 bg-gray-900/30"}`}>
          <h2 className={`text-sm font-semibold ${lightMode ? "text-gray-500" : "text-gray-500"}`}>{title} (0)</h2>
          <p className={`text-xs mt-1 ${lightMode ? "text-gray-400" : "text-gray-500"}`}>No puzzles</p>
        </div>
      );
    }
    const showAll = expanded || puzzles.length <= INITIAL_SHOW;
    const visible = showAll ? puzzles : puzzles.slice(0, INITIAL_SHOW);
    const hiddenCount = puzzles.length - INITIAL_SHOW;

    return (
      <div className={`rounded-lg border p-3 min-h-0 ${lightMode ? "border-gray-300 bg-gray-50/50" : "border-gray-700 bg-gray-900/30"}`}>
        <h2 className={`text-sm font-semibold mb-2 ${lightMode ? "text-gray-700" : "text-gray-300"}`}>
          {title} ({puzzles.length})
        </h2>
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {visible.map((puzzle) => {
            const solved = isSolved(puzzle, type);
            const borderCls = lightMode
              ? solved
                ? "border-green-300 bg-green-50 hover:bg-green-100"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
              : solved
                ? "border-green-700 bg-green-900/30 hover:bg-green-900/50"
                : "border-gray-700 bg-gray-800/50 hover:bg-gray-800";
            return (
              <Link
                key={`${type}-${puzzle.id}`}
                to={puzzleLink(puzzle, type)}
                onClick={() => {
                  if (shouldSendAnalytics() && window.gtag && typeof window.gtag === "function") {
                    window.gtag("event", "author_puzzle_clicked", {
                      author,
                      puzzle_id: String(puzzle.id),
                      mode: type,
                    });
                  }
                }}
                className={`block px-3 py-2 rounded border transition-colors text-sm ${borderCls}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium truncate ${lightMode ? "text-gray-900" : "text-gray-100"}`}>
                    {puzzle.date ? formatDateWithDayOfWeek(puzzle.date) : `#${puzzle.id}`}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {solved && <span className="text-green-500 text-xs">✓</span>}
                    <span className={`text-xs ${lightMode ? "text-gray-400" : "text-gray-500"}`}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className={`mt-2 w-full py-1.5 text-xs rounded border ${lightMode ? "border-gray-300 text-gray-600 hover:bg-gray-100" : "border-gray-600 text-gray-400 hover:bg-gray-800"}`}
          >
            Show {hiddenCount} more
          </button>
        )}
      </div>
    );
  };

  if (err) {
    return (
      <div className="px-3 py-4">
        <div className="text-red-400 mb-2">{err}</div>
        <Link to="/archives" className="text-sky-400 hover:underline">
          ← Archives
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          to="/archives"
          className={`text-sm ${lightMode ? "text-gray-600 hover:text-gray-800" : "text-gray-400 hover:text-gray-200"}`}
        >
          ← Archives
        </Link>
      </div>
      <h1 className={`text-xl font-semibold mb-2 ${lightMode ? "text-gray-900" : "text-gray-100"}`}>
        Puzzles by {author || "…"}
      </h1>
      {totalCount === 0 ? (
        <p className={`text-sm ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
          No puzzles found for this author.
        </p>
      ) : (
        <>
          <p className={`text-sm mb-3 ${lightMode ? "text-gray-600" : "text-gray-400"}`}>
            {totalCount} puzzle{totalCount !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <PuzzleList puzzles={mainPuzzles} type="main" title="Main" />
            <PuzzleList puzzles={quickPuzzles} type="quick" title="Quick" />
          </div>
          {otherPuzzles.length > 0 && (
            <PuzzleList puzzles={otherPuzzles} type="other" title="Other Puzzles" />
          )}
        </>
      )}
    </div>
  );
}
