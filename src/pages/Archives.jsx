import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { parseLocalISODate } from "../lib/date.js";

export default function Archives() {
  const [manifest, setManifest] = useState([]);
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState({ year: 0, month: 0 });

  useEffect(() => {
    document.title = "Stepword Puzzles - Archives";
    fetchManifest()
      .then((list) => setManifest(list))
      .catch((e) => setErr(e.message));
  }, []);

  const completedIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("stepwords-completed") || "[]"));
    } catch {
      return new Set();
    }
  }, []);

  const { months, minDate, maxDate, minYM, maxYM } = useMemo(() => {
    if (!manifest.length) return { months: [], minDate: null, maxDate: null, minYM: null, maxYM: null };

    // Map date string -> puzzle
    const byDate = new Map();
    let minDate = null;
    let maxDate = null;
    for (const p of manifest) {
      byDate.set(p.date, p);
      const d = parseLocalISODate(p.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

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
        const puzzle = byDate.get(iso) || null;
        return { date: d, puzzle };
      });
      return { year, month, cells };
    });

    return { months: monthData, minDate, maxDate, minYM: months[0], maxYM: months[months.length - 1] };
  }, [manifest]);

  // Initialize current to latest month once months are available
  useEffect(() => {
    if (months.length) {
      const latest = months[months.length - 1];
      setCurrent({ year: latest.year, month: latest.month });
    }
  }, [months.length]);

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

  const monthName = (y, m) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(y, m, 1));

  return (
    <div className="px-3 py-3 flex justify-center">
      <div className="w-full max-w-[420px]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button onClick={goPrev} disabled={!canPrev} className="px-2 py-1 text-xs rounded border border-gray-800 disabled:opacity-40">◀</button>
          <div className="flex items-center gap-2">
            <select value={current.year} onChange={onYearChange} className="bg-black border border-gray-800 rounded px-2 py-1 text-xs">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={current.month} onChange={onMonthChange} className="bg-black border border-gray-800 rounded px-2 py-1 text-xs">
              {allowedMonthsForYear(current.year).map((m) => (
                <option key={m} value={m}>{new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(current.year, m, 1))}</option>
              ))}
            </select>
          </div>
          <button onClick={goNext} disabled={!canNext} className="px-2 py-1 text-xs rounded border border-gray-800 disabled:opacity-40">▶</button>
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
                    <div key={idx} className="h-8 rounded border border-gray-800 bg-gray-900/40 text-gray-600 flex items-center justify-center">
                      {dayNum}
                    </div>
                  );
                }
                const solved = completedIds.has(puzzle.id);
                const icon = solved ? '✓' : '🪜';
                const color = solved ? 'text-green-400' : 'text-gray-300';
                const bg = solved ? 'bg-gray-900/60' : 'bg-gray-900/40';
                return (
                  <Link key={idx} to={`/${puzzle.id}`} className={`h-8 rounded border border-gray-800 ${bg} hover:border-gray-600 flex items-center justify-center gap-1`}>
                    <span className="text-[10px] text-gray-400">{dayNum}</span>
                    <span className={`${color} text-xs leading-none`}>{icon}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
