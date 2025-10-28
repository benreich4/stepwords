import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";
import { parseLocalISODate } from "../lib/date.js";

export default function Archives() {
  const [manifest, setManifest] = useState([]);
  const [err, setErr] = useState("");
  const [quickManifest, setQuickManifest] = useState([]);
  const [current, setCurrent] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('stepwords-archives-current') || 'null');
      if (saved && typeof saved.year === 'number' && typeof saved.month === 'number') return saved;
    } catch {}
    return { year: 0, month: 0 };
  });

  useEffect(() => {
    document.title = "Stepword Puzzles - Archives";
    fetchManifest()
      .then((list) => setManifest(list))
      .catch((e) => setErr(e.message));
    fetchQuickManifest()
      .then((list) => setQuickManifest(list))
      .catch(() => { /* quick is optional; ignore errors */ });
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
      return new Set(JSON.parse(localStorage.getItem('quickstep-completed') || '[]'));
    } catch {
      return new Set();
    }
  }, []);

  const { months, minDate, maxDate, minYM, maxYM, quickByDate } = useMemo(() => {
    if (!manifest.length) return { months: [], minDate: null, maxDate: null, minYM: null, maxYM: null, quickByDate: new Map() };

    // Map date string -> puzzle (main)
    const byDate = new Map();
    const quickMap = new Map();
    let minDate = null;
    let maxDate = null;
    for (const p of manifest) {
      byDate.set(p.date, p);
      const d = parseLocalISODate(p.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }
    // Map quick puzzles by date (if available)
    for (const q of (quickManifest || [])) {
      quickMap.set(q.date, q);
    }

    // Clamp maxDate to today (ET) unless preview is enabled
    const todayET = getTodayIsoInET();
    const preview = isPreviewEnabled();
    const todayDate = parseLocalISODate(todayET);
    if (!preview && maxDate && maxDate > todayDate) maxDate = todayDate;

    // Build list of months from minDate to maxDate inclusive
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const months = [];

    for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); ) {
      months.push({ year: y, month: m });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }

    // For each month, build a 6x7 grid of dates (Sun-Sat)
    const todayET2 = getTodayIsoInET();
    const preview2 = isPreviewEnabled();
    const monthData = months.map(({ year, month }) => {
      const firstOfMonth = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startOffset = firstOfMonth.getDay(); // 0=Sun
      const cells = Array.from({ length: 42 }, (_, idx) => {
        const dayNum = idx - startOffset + 1;
        if (dayNum < 1 || dayNum > daysInMonth) return null; // outside current month
        const d = new Date(year, month, dayNum);
        // Only render within puzzle range
        if (d < minDate || d > maxDate) return { date: d, puzzle: null };
        const iso = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
        const puzzle = (preview2 || iso <= todayET2) ? (byDate.get(iso) || null) : null;
        return { date: d, puzzle };
      });
      return { year, month, cells };
    });

    return { months: monthData, minDate, maxDate, minYM: months[0], maxYM: months[months.length - 1], quickByDate: quickMap };
  }, [manifest, quickManifest]);

  // Build a parallel Quick calendar by reusing the same dates but linking to /quick/:id
  const miniMonths = months; // structure reused for layout

  // Initialize current to latest month once months are available
  useEffect(() => {
    if (months.length) {
      if (current.year === 0) {
        const latest = months[months.length - 1];
        setCurrent({ year: latest.year, month: latest.month });
      }
    }
  }, [months.length]);

  // Persist current archive view
  useEffect(() => {
    try { localStorage.setItem('stepwords-archives-current', JSON.stringify(current)); } catch {}
  }, [current]);

  const years = useMemo(() => {
    if (!minDate || !maxDate) return [];
    const ys = [];
    for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) ys.push(y);
    return ys;
  }, [minDate, maxDate]);

  const allowedMonthsForYear = (y) => {
    if (!minDate || !maxDate) return [...Array(12).keys()];
    const minY = minDate.getFullYear();
    const maxY = maxDate.getFullYear();
    let start = 0, end = 11;
    if (y === minY) start = minDate.getMonth();
    if (y === maxY) end = maxDate.getMonth();
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const canPrev = months.length && (current.year > (minYM?.year ?? 0) || (current.year === (minYM?.year ?? 0) && current.month > (minYM?.month ?? 0)));
  const canNext = months.length && (current.year < (maxYM?.year ?? 0) || (current.year === (maxYM?.year ?? 0) && current.month < (maxYM?.month ?? 0)));

  const ensureInRange = (y, m) => {
    // Clamp year and month to available range
    let year = y, month = m;
    if (minDate && year < minDate.getFullYear()) year = minDate.getFullYear();
    if (maxDate && year > maxDate.getFullYear()) year = maxDate.getFullYear();
    const allowed = allowedMonthsForYear(year);
    if (!allowed.includes(month)) {
      if (month < allowed[0]) month = allowed[0];
      if (month > allowed[allowed.length - 1]) month = allowed[allowed.length - 1];
    }
    return { year, month };
  };

  const goPrev = () => {
    if (!canPrev) return;
    let y = current.year, m = current.month - 1;
    if (m < 0) { m = 11; y -= 1; }
    setCurrent(ensureInRange(y, m));
  };
  const goNext = () => {
    if (!canNext) return;
    let y = current.year, m = current.month + 1;
    if (m > 11) { m = 0; y += 1; }
    setCurrent(ensureInRange(y, m));
  };

  const onYearChange = (e) => {
    const y = parseInt(e.target.value, 10);
    setCurrent((cur) => ensureInRange(y, cur.month));
  };
  const onMonthChange = (e) => {
    const m = parseInt(e.target.value, 10);
    setCurrent((cur) => ensureInRange(cur.year, m));
  };

  const currentMonthData = months.find((mm) => mm.year === current.year && mm.month === current.month);

  // const monthName = (y, m) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(y, m, 1));

  return (
    <div className="px-3 py-3 flex justify-center">
      <div className="w-full max-w-[420px]">
        <div className="mb-2 flex items-center justify-between gap-2">
          {(() => { const lightMode = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })(); return (
          <>
          <button onClick={goPrev} disabled={!canPrev} className={`px-2 py-1 text-xs rounded border disabled:opacity-40 ${lightMode ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-800'}`}>◀</button>
          <div className="flex items-center gap-2">
            <select value={current.year} onChange={onYearChange} className={`rounded px-2 py-1 text-xs border ${lightMode ? 'bg-white border-gray-300 text-gray-800' : 'bg-black border-gray-800'}`}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={current.month} onChange={onMonthChange} className={`rounded px-2 py-1 text-xs border ${lightMode ? 'bg-white border-gray-300 text-gray-800' : 'bg-black border-gray-800'}`}>
              {allowedMonthsForYear(current.year).map((m) => (
                <option key={m} value={m}>{new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(current.year, m, 1))}</option>
              ))}
            </select>
          </div>
          <button onClick={goNext} disabled={!canNext} className={`px-2 py-1 text-xs rounded border disabled:opacity-40 ${lightMode ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-800'}`}>▶</button>
          </>
          )})()}
        </div>
      {err && <div className="text-red-400 mb-2">{err}</div>}

      {!months.length && !err && (
        <div className="text-gray-400 mt-4">No puzzles found.</div>
      )}

        {currentMonthData && (
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {currentMonthData.cells.map((cell, idx) => {
                if (cell === null) {
                  return <div key={idx} className="h-8" />;
                }
                const dayNum = cell.date.getDate();
                const puzzle = cell.puzzle;
                if (!puzzle) {
                  return (
                    <div key={idx} className={`h-8 rounded border flex items-center justify-center ${(() => { const lightMode = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })(); return lightMode ? 'border-gray-300 bg-gray-100 text-gray-500' : 'border-gray-800 bg-gray-900/40 text-gray-600'; })()}`}>
                      {dayNum}
                    </div>
                  );
                }
                const solved = completedIds.has(puzzle.id);
                const perfectSet = (() => {
                  try { return new Set(JSON.parse(localStorage.getItem('stepwords-perfect') || '[]')); } catch { return new Set(); }
                })();
                const isPerfect = solved && perfectSet.has(puzzle.id);
                const hasProgress = (() => {
                  try {
                    const raw = localStorage.getItem(`stepwords-${puzzle.id}`);
                    if (!raw) return false;
                    const s = JSON.parse(raw);
                    // Consider it "started" only if there is meaningful progress
                    if (s?.guessCount > 0 || s?.hintCount > 0 || s?.wrongGuessCount > 0) return true;
                    if (Array.isArray(s?.guesses) && s.guesses.some(g => (g || '').trim().length > 0)) return true;
                    if (Array.isArray(s?.lockColors) && s.lockColors.some(row => Array.isArray(row) && row.some(c => c))) return true;
                    if (typeof s?.level === 'number' && s.level > 0) return true;
                    return false;
                  } catch { return false; }
                })();
                // Stars override; use special icon and color per score
                const starsMap = (() => { try { return JSON.parse(localStorage.getItem('stepwords-stars') || '{}'); } catch { return {}; } })();
                const starScore = starsMap[puzzle.id];
                const isPerfectNow = (() => { try { return new Set(JSON.parse(localStorage.getItem('stepwords-perfect') || '[]')).has(puzzle.id); } catch { return false; } })();
                const failed = Number.isFinite(starScore) && starScore === 0 && !solved;
                const icon = failed
                  ? '❌'
                  : (Number.isFinite(starScore)
                    ? (isPerfectNow ? '🤩' : (starScore === 3 ? '🌟' : (starScore === 2 ? '⭐️' : (starScore === 1 ? '💫' : '☆'))))
                    : (isPerfect ? '🤩' : (solved ? '⭐️' : (hasProgress ? '👟' : '🪜'))));
                const color = failed
                  ? 'text-red-400'
                  : (Number.isFinite(starScore)
                    ? 'text-yellow-300'
                    : (isPerfect ? 'text-yellow-300' : (solved ? 'text-yellow-300' : hasProgress ? 'text-yellow-300' : 'text-gray-300')));
                const lightMode = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })();
                const bg = lightMode ? (solved ? 'bg-gray-200' : 'bg-gray-100') : (solved ? 'bg-gray-900/60' : 'bg-gray-900/40');
                return (
                  <Link key={idx} to={`/${puzzle.id}`} className={`h-8 rounded border ${lightMode ? 'border-gray-300 hover:border-gray-400' : 'border-gray-800 hover:border-gray-600'} ${bg} flex items-center justify-center gap-1`}>
                    <span className={`text-[10px] ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>{dayNum}</span>
                    <span className={`${color} text-xs leading-none`}>{icon}</span>
                  </Link>
                );
              })}
            </div>
            {/* Quick Stepword calendar */}
            <div className="mt-6">
              {(() => { const lightMode = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })(); return (
              <div className={`text-xs mb-1 ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Quick Stepwords</div>
              )})()}
              <div className="grid grid-cols-7 gap-1">
                {currentMonthData.cells.map((cell, idx) => {
                  if (cell === null) {
                    return <div key={idx} className="h-8" />;
                  }
                  const dayNum = cell.date.getDate();
                  const iso = [cell.date.getFullYear(), String(cell.date.getMonth()+1).padStart(2,'0'), String(cell.date.getDate()).padStart(2,'0')].join('-');
                  const todayET2 = getTodayIsoInET();
                  const preview2 = isPreviewEnabled();
                  const puzzle = (preview2 || iso <= todayET2) ? (quickByDate.get(iso) || null) : null;
                  if (!puzzle) {
                    return (
                      <div key={idx} className={`h-8 rounded border flex items-center justify-center ${(() => { const lightMode = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })(); return lightMode ? 'border-gray-300 bg-gray-100 text-gray-500' : 'border-gray-800 bg-gray-900/40 text-gray-600'; })()}`}>
                        {dayNum}
                      </div>
                    );
                  }
                  // Status for quick puzzles (use same icons)
                  const qSolved = quickCompletedIds.has(puzzle.id);
                  const qPerfectSet = (() => {
                    try { return new Set(JSON.parse(localStorage.getItem('quickstep-perfect') || '[]')); } catch { return new Set(); }
                  })();
                  const qIsPerfect = qSolved && qPerfectSet.has(puzzle.id);
                  const qHasProgress = (() => {
                    try {
                      const raw = localStorage.getItem(`quickstep-${puzzle.id}`);
                      if (!raw) return false;
                      const s = JSON.parse(raw);
                      if (s?.guessCount > 0 || s?.hintCount > 0 || s?.wrongGuessCount > 0) return true;
                      if (Array.isArray(s?.guesses) && s.guesses.some(g => (g || '').trim().length > 0)) return true;
                      if (Array.isArray(s?.lockColors) && s.lockColors.some(row => Array.isArray(row) && row.some(c => c))) return true;
                      if (typeof s?.level === 'number' && s.level > 0) return true;
                      return false;
                    } catch { return false; }
                  })();
                  const qStarsMap = (() => { try { return JSON.parse(localStorage.getItem('quickstep-stars') || '{}'); } catch { return {}; } })();
                  const qStarScore = qStarsMap[puzzle.id];
                  const qIsPerfectNow = (() => { try { return new Set(JSON.parse(localStorage.getItem('quickstep-perfect') || '[]')).has(puzzle.id); } catch { return false; } })();
                  const qFailed = Number.isFinite(qStarScore) && qStarScore === 0 && !qSolved;
                  const qIcon = qFailed
                    ? '❌'
                    : (Number.isFinite(qStarScore)
                      ? (qIsPerfectNow ? '🤩' : (qStarScore === 3 ? '🌟' : (qStarScore === 2 ? '⭐️' : (qStarScore === 1 ? '💫' : '☆'))))
                      : (qIsPerfect ? '🤩' : (qSolved ? '⭐️' : (qHasProgress ? '👟' : '🪜'))));
                  const qColor = qFailed
                    ? 'text-red-400'
                    : (Number.isFinite(qStarScore)
                      ? 'text-yellow-300'
                      : (qIsPerfect ? 'text-yellow-300' : (qSolved ? 'text-yellow-300' : qHasProgress ? 'text-yellow-300' : 'text-gray-300')));
                  const lightMode2 = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })();
                  const qBg = lightMode2 ? (qSolved ? 'bg-gray-200' : 'bg-gray-100') : (qSolved ? 'bg-gray-900/60' : 'bg-gray-900/40');
                  return (
                    <Link key={idx} to={`/quick/${puzzle.id}`} className={`h-8 rounded border ${lightMode2 ? 'border-gray-300 hover:border-gray-400' : 'border-gray-800 hover:border-gray-600'} ${qBg} flex items-center justify-center gap-1`}>
                      <span className={`text-[10px] ${lightMode2 ? 'text-gray-600' : 'text-gray-400'}`}>{dayNum}</span>
                      <span className={`${qColor} text-xs leading-none`}>{qIcon}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            {/* Legend */}
            {(() => { const lightMode = (()=>{ try { const s=JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; } })(); return (
            <div className={`mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <span className="flex items-center gap-1"><span className="text-yellow-400">🤩</span> Perfect</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300">🌟</span> 3 stars</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300">⭐️</span> 2 stars</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300">💫</span> 1 star</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300">☆</span> 0 stars</span>
              <span className="flex items-center gap-1"><span className="text-red-400">❌</span> Failed</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300">👟</span> In progress</span>
              <span className="flex items-center gap-1"><span className={`${lightMode ? 'text-gray-500' : 'text-gray-300'}`}>🪜</span> Not started</span>
            </div>
            )})()}
          </div>
        )}
      </div>
    </div>
  );
}
