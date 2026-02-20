import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getInitialLightMode } from "../lib/theme.js";

const fetchOpts = { credentials: "include" };

function Admin() {
  const [authenticated, setAuthenticated] = useState(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const lightMode = useState(() => getInitialLightMode())[0];
  // Ratings table sort/filter
  const [ratingsSort, setRatingsSort] = useState({ col: "date", dir: "desc" });
  const [ratingsFilter, setRatingsFilter] = useState({ puzzle: "", mode: "", avgMin: "", countMin: "", completionsMin: "" });
  const [openDistribution, setOpenDistribution] = useState(null);

  const checkAuth = async () => {
    try {
      const r = await fetch("/api/admin-stats.php", fetchOpts);
      if (r.ok) {
        const data = await r.json();
        setStats(data);
        setAuthenticated(true);
        return true;
      }
      setAuthenticated(false);
      return false;
    } catch {
      setAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Must run before any early return to satisfy Rules of Hooks
  const byPuzzle = (stats?.ratings?.by_puzzle) || [];
  const ratingsFilteredSorted = useMemo(() => {
    let list = [...byPuzzle];
    const { puzzle, mode, avgMin, countMin, completionsMin } = ratingsFilter;
    if (puzzle.trim()) {
      const q = puzzle.trim().toLowerCase();
      list = list.filter((p) => String(p.puzzle_id || "").toLowerCase().includes(q));
    }
    if (mode.trim()) {
      const m = mode.trim().toLowerCase();
      list = list.filter((p) => String(p.mode || "").toLowerCase() === m);
    }
    if (avgMin !== "") {
      const v = parseFloat(avgMin);
      if (!Number.isNaN(v)) list = list.filter((p) => (p.avg ?? 0) >= v);
    }
    if (countMin !== "") {
      const v = parseInt(countMin, 10);
      if (!Number.isNaN(v)) list = list.filter((p) => (p.count ?? 0) >= v);
    }
    if (completionsMin !== "") {
      const v = parseInt(completionsMin, 10);
      if (!Number.isNaN(v)) list = list.filter((p) => (p.completions ?? 0) >= v);
    }
    const { col, dir } = ratingsSort;
    list.sort((a, b) => {
      let va = col === "puzzle_id" ? String(a.puzzle_id || "") : col === "mode" ? String(a.mode || "") : col === "date" ? String(a.date || "") : col === "avg" ? (a.avg ?? 0) : col === "completions" ? (a.completions ?? 0) : col === "avg_solve_time_ms" ? (a.avg_solve_time_ms ?? 0) : col === "avg_hints_used" ? (a.avg_hints_used ?? 0) : (a.count ?? 0);
      let vb = col === "puzzle_id" ? String(b.puzzle_id || "") : col === "mode" ? String(b.mode || "") : col === "date" ? String(b.date || "") : col === "avg" ? (b.avg ?? 0) : col === "completions" ? (b.completions ?? 0) : col === "avg_solve_time_ms" ? (b.avg_solve_time_ms ?? 0) : col === "avg_hints_used" ? (b.avg_hints_used ?? 0) : (b.count ?? 0);
      if (col === "puzzle_id" || col === "mode" || col === "date") {
        const cmp = va.localeCompare(vb);
        return dir === "asc" ? cmp : -cmp;
      }
      if (col === "avg" || col === "count" || col === "completions" || col === "avg_solve_time_ms" || col === "avg_hints_used") {
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [byPuzzle, ratingsFilter, ratingsSort]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const r = await fetch("/api/admin-auth.php", {
        ...fetchOpts,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json();
      if (r.ok && data.ok) {
        setAuthenticated(true);
        setPassword("");
        const sr = await fetch("/api/admin-stats.php", fetchOpts);
        if (sr.ok) setStats(await sr.json());
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (err) {
      setAuthError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin-logout.php", fetchOpts);
    } catch {}
    setAuthenticated(false);
    setStats(null);
  };

  const refreshStats = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin-stats.php", fetchOpts);
      if (r.ok) setStats(await r.json());
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${lightMode ? "bg-gray-100 text-gray-900" : "bg-gray-950 text-gray-100"}`}>
        <div className="text-sm opacity-70">Checking auth…</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${lightMode ? "bg-gray-100 text-gray-900" : "bg-gray-950 text-gray-100"}`}>
        <div className={`w-full max-w-sm rounded-xl border p-6 shadow-lg ${lightMode ? "border-gray-300 bg-white" : "border-gray-800 bg-gray-900"}`}>
          <h1 className="text-xl font-bold mb-4">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${lightMode ? "border-gray-300 bg-white" : "border-gray-700 bg-gray-800"} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {authError && <div className="text-sm text-red-500">{authError}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
          <p className="mt-4 text-xs text-gray-500">
            <Link to="/" className="text-blue-500 hover:underline">← Back to Stepwords</Link>
          </p>
        </div>
      </div>
    );
  }

  const s = stats?.summary || {};
  const ratings = stats?.ratings || {};
  const completionsByDay = stats?.completions_by_day || {};
  const completionsByMode = stats?.completions_by_mode || {};
  const submissions = stats?.submissions || {};

  const dayEntries = Object.entries(completionsByDay || {})
    .map(([date, byMode]) => ({
      date,
      main: byMode?.main ?? 0,
      quick: byMode?.quick ?? 0,
      other: byMode?.other ?? 0,
      total: (byMode?.main ?? 0) + (byMode?.quick ?? 0) + (byMode?.other ?? 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const toggleSort = (col) => {
    setRatingsSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : col === "avg" || col === "count" || col === "completions" || col === "avg_solve_time_ms" || col === "avg_hints_used" || col === "date" ? "desc" : "asc",
    }));
  };

  return (
    <div className={`min-h-screen ${lightMode ? "bg-gray-100 text-gray-900" : "bg-gray-950 text-gray-100"}`}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshStats}
              disabled={loading}
              className={`px-3 py-1.5 rounded text-sm border ${lightMode ? "border-gray-300 hover:bg-gray-200" : "border-gray-700 hover:bg-gray-800"} disabled:opacity-50`}
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/50"
            >
              Log out
            </button>
            <Link to="/" className="px-3 py-1.5 rounded text-sm border border-gray-600 text-gray-400 hover:bg-gray-800">
              ← Back
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
          {[
            { id: "summary", label: "Summary" },
            { id: "ratings", label: "Puzzle Stats" },
            { id: "completions", label: "Date stats" },
            { id: "submissions", label: "Submissions" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-t text-sm font-medium ${
                activeTab === id
                  ? lightMode ? "bg-white border border-b-0 border-gray-300 -mb-0.5" : "bg-gray-800 border border-b-0 border-gray-700 -mb-0.5"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {activeTab === "summary" && (
          <div className={`rounded-lg border p-4 ${lightMode ? "border-gray-300 bg-white" : "border-gray-800 bg-gray-900"}`}>
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total ratings" value={s.total_ratings} lightMode={lightMode} />
              <StatCard label="Total completions" value={s.total_completions} lightMode={lightMode} />
              <StatCard label="Puzzles rated" value={s.unique_puzzles_rated} lightMode={lightMode} />
              <StatCard label="Submissions" value={s.total_submissions} lightMode={lightMode} />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium mb-2">Completions by mode</h3>
              <div className="flex gap-4 flex-wrap">
                <span>Main: {completionsByMode.main ?? 0}</span>
                <span>Quick: {completionsByMode.quick ?? 0}</span>
                <span>Other: {completionsByMode.other ?? 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Ratings */}
        {activeTab === "ratings" && (
          <div className={`rounded-lg border p-4 ${lightMode ? "border-gray-300 bg-white" : "border-gray-800 bg-gray-900"}`}>
            <h2 className="text-lg font-semibold mb-2">Ratings by puzzle</h2>
            <p className="text-sm opacity-70 mb-4">
              Showing {ratingsFilteredSorted.length} of {byPuzzle.length} — Total: {ratings.total_count} ratings ({ratings.raw_count} raw entries before dedup)
            </p>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${lightMode ? "border-gray-200" : "border-gray-700"}`}>
                    <th className="text-left py-2 pr-4">
                      <SortableHeader col="date" label="Date" sort={ratingsSort} onSort={toggleSort} />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="puzzle_id" label="Puzzle" sort={ratingsSort} onSort={toggleSort} />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="mode" label="Mode" sort={ratingsSort} onSort={toggleSort} />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="avg" label="Avg" sort={ratingsSort} onSort={toggleSort} title="Avg rating" />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="count" label="N" sort={ratingsSort} onSort={toggleSort} title="Rating count" />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="completions" label="Done" sort={ratingsSort} onSort={toggleSort} title="Completions" />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="avg_solve_time_ms" label="Time" sort={ratingsSort} onSort={toggleSort} title="Avg solve time" />
                    </th>
                    <th className="text-right py-2">
                      <SortableHeader col="avg_hints_used" label="Hints" sort={ratingsSort} onSort={toggleSort} title="Avg hints used" />
                    </th>
                    <th className="text-left py-2 pl-2 whitespace-nowrap" title="Rating distribution (1–5 stars)">Stars</th>
                  </tr>
                  <tr className={`border-b ${lightMode ? "border-gray-200" : "border-gray-700"}`}>
                    <th className="text-left py-1.5 pr-4" />
                    <th className="text-right py-1.5 pr-2">
                      <input
                        type="text"
                        placeholder="Filter…"
                        value={ratingsFilter.puzzle}
                        onChange={(e) => setRatingsFilter((f) => ({ ...f, puzzle: e.target.value }))}
                        className={`w-full max-w-[120px] px-2 py-0.5 text-xs rounded border ${lightMode ? "border-gray-300 bg-white" : "border-gray-600 bg-gray-800"}`}
                      />
                    </th>
                    <th className="text-right py-1.5 pr-2">
                      <select
                        value={ratingsFilter.mode}
                        onChange={(e) => setRatingsFilter((f) => ({ ...f, mode: e.target.value }))}
                        className={`w-full max-w-[100px] px-2 py-0.5 text-xs rounded border ${lightMode ? "border-gray-300 bg-white" : "border-gray-600 bg-gray-800"}`}
                      >
                        <option value="">All</option>
                        <option value="main">main</option>
                        <option value="quick">quick</option>
                        <option value="other">other</option>
                      </select>
                    </th>
                    <th className="text-right py-1.5">
                      <input
                        type="number"
                        placeholder="Min"
                        min={0}
                        max={5}
                        step={0.1}
                        value={ratingsFilter.avgMin}
                        onChange={(e) => setRatingsFilter((f) => ({ ...f, avgMin: e.target.value }))}
                        className={`w-14 px-1 py-0.5 text-xs rounded border ${lightMode ? "border-gray-300 bg-white" : "border-gray-600 bg-gray-800"}`}
                      />
                    </th>
                    <th className="text-right py-1.5">
                      <input
                        type="number"
                        placeholder="Min"
                        min={0}
                        value={ratingsFilter.countMin}
                        onChange={(e) => setRatingsFilter((f) => ({ ...f, countMin: e.target.value }))}
                        className={`w-14 px-1 py-0.5 text-xs rounded border ${lightMode ? "border-gray-300 bg-white" : "border-gray-600 bg-gray-800"}`}
                      />
                    </th>
                    <th className="text-right py-1.5">
                      <input
                        type="number"
                        placeholder="Min"
                        min={0}
                        value={ratingsFilter.completionsMin}
                        onChange={(e) => setRatingsFilter((f) => ({ ...f, completionsMin: e.target.value }))}
                        className={`w-14 px-1 py-0.5 text-xs rounded border ${lightMode ? "border-gray-300 bg-white" : "border-gray-600 bg-gray-800"}`}
                      />
                    </th>
                    <th className="text-right py-1.5" />
                    <th className="text-right py-1.5" />
                    <th className="pl-2" />
                  </tr>
                </thead>
                <tbody>
                  {ratingsFilteredSorted.map((p) => (
                    <tr key={`${p.puzzle_id}-${p.mode}`} className={`border-b ${lightMode ? "border-gray-100" : "border-gray-800"}`}>
                      <td className="py-1.5 pr-4">{p.date ?? "—"}</td>
                      <td className="text-right py-1.5 font-mono">{p.puzzle_id}</td>
                      <td className="text-right py-1.5">{p.mode}</td>
                      <td className="text-right py-1.5">{p.avg?.toFixed(2) ?? "—"}</td>
                      <td className="text-right py-1.5">{p.count ?? 0}</td>
                      <td className="text-right py-1.5">{p.completions ?? 0}</td>
                      <td className="text-right py-1.5">{formatSolveTime(p.avg_solve_time_ms)}</td>
                      <td className="text-right py-1.5">{p.avg_hints_used != null ? p.avg_hints_used.toFixed(1) : "—"}</td>
                      <td className="py-1.5 pl-2">
                        <DistributionTrigger
                          byRating={p.by_rating || {}}
                          onOpen={() => setOpenDistribution({ key: `${p.puzzle_id}-${p.mode}`, byRating: p.by_rating || {}, puzzleId: p.puzzle_id, mode: p.mode })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ratingsFilteredSorted.length === 0 && <p className="py-4 text-gray-500">No ratings match the filters.</p>}
            </div>
            {openDistribution && (
              <DistributionModal
                byRating={openDistribution.byRating}
                puzzleId={openDistribution.puzzleId}
                mode={openDistribution.mode}
                lightMode={lightMode}
                onClose={() => setOpenDistribution(null)}
              />
            )}
          </div>
        )}

        {/* Date stats */}
        {activeTab === "completions" && (
          <div className={`rounded-lg border p-4 ${lightMode ? "border-gray-300 bg-white" : "border-gray-800 bg-gray-900"}`}>
            <h2 className="text-lg font-semibold mb-4">Completions by day</h2>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${lightMode ? "border-gray-200" : "border-gray-700"}`}>
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Main</th>
                    <th className="text-right py-2">Quick</th>
                    <th className="text-right py-2">Other</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map((row) => (
                    <tr key={row.date} className={`border-b ${lightMode ? "border-gray-100" : "border-gray-800"}`}>
                      <td className="py-1.5">{row.date}</td>
                      <td className="text-right py-1.5 font-mono">{row.main}</td>
                      <td className="text-right py-1.5 font-mono">{row.quick}</td>
                      <td className="text-right py-1.5 font-mono">{row.other}</td>
                      <td className="text-right py-1.5 font-mono font-medium">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dayEntries.length === 0 && <p className="py-4 text-gray-500">No completion data yet.</p>}
            </div>
          </div>
        )}

        {/* Submissions */}
        {activeTab === "submissions" && (
          <div className={`rounded-lg border p-4 ${lightMode ? "border-gray-300 bg-white" : "border-gray-800 bg-gray-900"}`}>
            <h2 className="text-lg font-semibold mb-2">Puzzle submissions</h2>
            <p className="text-sm opacity-70 mb-4">Total: {submissions.total ?? 0} submissions</p>
            <h3 className="text-sm font-medium mb-2">Recent (last 20)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${lightMode ? "border-gray-200" : "border-gray-700"}`}>
                    <th className="text-left py-2">Author</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Submitted</th>
                    <th className="text-left py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(submissions.recent || []).map((sub, i) => (
                    <tr key={sub.id ?? i} className={`border-b ${lightMode ? "border-gray-100" : "border-gray-800"}`}>
                      <td className="py-1.5">{sub.author ?? "—"}</td>
                      <td className="py-1.5">{sub.email ?? "—"}</td>
                      <td className="py-1.5 text-gray-500">{sub.submittedAt ?? "—"}</td>
                      <td className="py-1.5">
                        {sub.id && (
                          <Link to={`/submissions/${encodeURIComponent(sub.id)}`} className="text-sky-400 hover:underline">
                            Open
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(submissions.recent || []).length === 0 && <p className="py-4 text-gray-500">No submissions yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSolveTime(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${String(rm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SortableHeader({ col, label, sort, onSort, title }) {
  const isActive = sort.col === col;
  const arrow = isActive ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      title={title}
      className={`font-medium hover:underline whitespace-nowrap ${isActive ? "" : "opacity-70"}`}
    >
      {label}{arrow}
    </button>
  );
}

function StatCard({ label, value, lightMode }) {
  return (
    <div className={`rounded border p-3 ${lightMode ? "border-gray-200 bg-gray-50" : "border-gray-800 bg-gray-800/50"}`}>
      <div className="text-xs opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value ?? "—"}</div>
    </div>
  );
}

function DistributionTrigger({ byRating, onOpen }) {
  const total = [1, 2, 3, 4, 5].reduce((s, i) => s + (byRating[i] || 0), 0);
  return (
    <button
      type="button"
      onClick={onOpen}
      title="View rating distribution"
      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
        total > 0
          ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/25"
          : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-default"
      }`}
    >
      {total > 0 ? "★" : "—"}
    </button>
  );
}

function DistributionModal({ byRating, puzzleId, mode, lightMode, onClose }) {
  const counts = [1, 2, 3, 4, 5].map((i) => byRating[i] || 0);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((s, n) => s + n, 0);

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`max-w-sm w-full mx-4 rounded-lg border shadow-xl p-4 ${lightMode ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">
            Rating distribution — {puzzleId} ({mode})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -m-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex items-end justify-between gap-2 px-2" style={{ height: 100 }}>
          {[1, 2, 3, 4, 5].map((i) => {
            const n = counts[i - 1];
            const barH = max > 0 ? Math.max((n / max) * 72, n > 0 ? 4 : 0) : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full flex-1 flex flex-col justify-end items-center rounded-t ${
                    lightMode ? "bg-gray-100" : "bg-gray-800"
                  }`}
                >
                  <div
                    className="w-3/4 min-w-[14px] bg-amber-500 rounded-t"
                    style={{ height: barH }}
                    title={`${i}★: ${n}`}
                  />
                </div>
                <span className="text-xs font-medium">{i}★</span>
                <span className="text-[10px] text-gray-500">{n}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">{total} ratings</p>
      </div>
    </div>
  );
}

export default Admin;
