import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET, isPreviewEnabled, parseLocalISODate } from "../lib/date.js";
import { getInitialLightMode, readLightMode } from "../lib/theme.js";
import { readSet, readMap, cellStatus } from "../lib/puzzleStatus.js";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Archives() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState([]);
  const [quickManifest, setQuickManifest] = useState([]);
  const [err, setErr] = useState("");
  const [lightMode, setLightMode] = useState(getInitialLightMode);
  const [current, setCurrent] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("stepwords-archives-current") || "null");
      if (saved && typeof saved.year === "number" && typeof saved.month === "number") return saved;
    } catch {}
    return { year: 0, month: 0 };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(0);

  useEffect(() => {
    document.title = "Stepwords — Archives";
    fetchManifest().then(setManifest).catch((e) => setErr(e.message));
    fetchQuickManifest().then(setQuickManifest).catch(() => {});
    const onSettings = () => {
      try { const s = JSON.parse(localStorage.getItem("stepwords-settings") || "{}"); setLightMode(readLightMode(s)); } catch {}
    };
    document.addEventListener("stepwords-settings-updated", onSettings);
    return () => document.removeEventListener("stepwords-settings-updated", onSettings);
  }, []);

  const completedIds = useMemo(() => readSet("stepwords-completed"), []);
  const quickCompletedIds = useMemo(() => readSet("quickstep-completed"), []);
  const mainStars = useMemo(() => readMap("stepwords-stars"), []);
  const quickStars = useMemo(() => readMap("quickstep-stars"), []);
  const mainPerfect = useMemo(() => readSet("stepwords-perfect"), []);
  const quickPerfect = useMemo(() => readSet("quickstep-perfect"), []);

  const { months, minDate, maxDate, minYM, maxYM, quickByDate } = useMemo(() => {
    if (!manifest.length) return { months: [], minDate: null, maxDate: null, minYM: null, maxYM: null, quickByDate: new Map() };
    const byDate = new Map();
    const quickMap = new Map();
    let minDate = null, maxDate = null;
    for (const p of manifest) {
      byDate.set(p.date, p);
      const d = parseLocalISODate(p.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }
    for (const q of quickManifest || []) quickMap.set(q.date, q);

    const todayET = getTodayIsoInET();
    const preview = isPreviewEnabled();
    const todayDate = parseLocalISODate(todayET);
    if (!preview && maxDate && maxDate > todayDate) maxDate = todayDate;

    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const monthsList = [];
    for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth());) {
      monthsList.push({ year: y, month: m });
      m += 1; if (m > 11) { m = 0; y += 1; }
    }

    const monthData = monthsList.map(({ year, month }) => {
      const firstOfMonth = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startOffset = firstOfMonth.getDay();
      const cells = Array.from({ length: 42 }, (_, idx) => {
        const dayNum = idx - startOffset + 1;
        if (dayNum < 1 || dayNum > daysInMonth) return null;
        const d = new Date(year, month, dayNum);
        if (d < minDate || d > maxDate) return { date: d, puzzle: null };
        const iso = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
        const puzzle = (preview || iso <= todayET) ? byDate.get(iso) || null : null;
        return { date: d, puzzle };
      });
      return { year, month, cells };
    });

    return { months: monthData, minDate, maxDate, minYM: monthsList[0], maxYM: monthsList[monthsList.length - 1], quickByDate: quickMap };
  }, [manifest, quickManifest]);

  useEffect(() => {
    if (months.length && current.year === 0) {
      const latest = months[months.length - 1];
      setCurrent({ year: latest.year, month: latest.month });
    }
  }, [months.length]);

  useEffect(() => {
    try { localStorage.setItem("stepwords-archives-current", JSON.stringify(current)); } catch {}
  }, [current]);

  const allowedMonthsForYear = (y) => {
    if (!minDate || !maxDate) return [...Array(12).keys()];
    let start = 0, end = 11;
    if (y === minDate.getFullYear()) start = minDate.getMonth();
    if (y === maxDate.getFullYear()) end = maxDate.getMonth();
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const canPrev = months.length && (current.year > (minYM?.year ?? 0) || (current.year === (minYM?.year ?? 0) && current.month > (minYM?.month ?? 0)));
  const canNext = months.length && (current.year < (maxYM?.year ?? 0) || (current.year === (maxYM?.year ?? 0) && current.month < (maxYM?.month ?? 0)));

  const ensureInRange = (y, m) => {
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

  const goPrev = () => { if (!canPrev) return; let y = current.year, m = current.month - 1; if (m < 0) { m = 11; y -= 1; } setCurrent(ensureInRange(y, m)); };
  const goNext = () => { if (!canNext) return; let y = current.year, m = current.month + 1; if (m > 11) { m = 0; y += 1; } setCurrent(ensureInRange(y, m)); };

  const goRandom = (list, completed, prefix) => {
    if (!list?.length) return;
    const today = getTodayIsoInET();
    const preview = isPreviewEnabled();
    const eligible = list.filter((p) => preview || p.date <= today);
    const unsolved = eligible.filter((p) => !completed.has(p.id));
    const pool = unsolved.length ? unsolved : eligible;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick?.id != null) navigate(`${prefix}${pick.id}`);
  };

  const currentMonthData = months.find((mm) => mm.year === current.year && mm.month === current.month);

  // ---- shared styles ----
  const pill = lightMode
    ? "border-parchment-300 bg-parchment-50 text-navyink-700 hover:bg-parchment-100"
    : "border-navyink-700 bg-navyink-800 text-parchment-200 hover:bg-navyink-700";
  const muted = lightMode ? "text-navyink-700/55" : "text-parchment-200/50";

  const minYear = minDate?.getFullYear() ?? 0;
  const maxYear = maxDate?.getFullYear() ?? 0;
  const monthLabel = months.length
    ? `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(current.year, current.month, 1))} ${current.year}`
    : "";
  const openPicker = () => { setPickerYear(current.year); setPickerOpen((o) => !o); };
  const pickMonth = (m) => { setCurrent(ensureInRange(pickerYear, m)); setPickerOpen(false); };

  const Calendar = ({ accent, label, getCell }) => (
    <div className={`rounded-3xl border p-4 ${lightMode ? "border-parchment-200 bg-parchment-50 shadow-card" : "border-navyink-700 bg-navyink-800 shadow-card-dark"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
        <div className="font-serif text-base font-bold">{label}</div>
      </div>
      <div className={`mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium ${muted}`}>
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {currentMonthData.cells.map((cell, idx) => {
          if (cell === null) return <div key={idx} className="aspect-square" />;
          const dayNum = cell.date.getDate();
          const iso = [cell.date.getFullYear(), String(cell.date.getMonth() + 1).padStart(2, "0"), String(cell.date.getDate()).padStart(2, "0")].join("-");
          const { puzzle, status } = getCell(cell, iso);
          if (!puzzle) {
            return (
              <div key={idx} className={`flex aspect-square items-center justify-center rounded-xl text-xs ${lightMode ? "bg-parchment-100 text-navyink-700/35" : "bg-navyink-850 text-parchment-200/25"}`}>
                {dayNum}
              </div>
            );
          }
          const stateCls = status.failed
            ? (lightMode ? "bg-red-50 border-red-300 hover:border-red-400" : "bg-red-900/25 border-red-800 hover:border-red-600")
            : status.solved
              ? (lightMode ? "bg-emerald-50 border-emerald-300 hover:border-emerald-400" : "bg-emerald-900/25 border-emerald-700 hover:border-emerald-500")
              : (lightMode ? "bg-white border-parchment-300 hover:border-parchment-400" : "bg-navyink-850 border-navyink-700 hover:border-navyink-600");
          return (
            <Link
              key={idx}
              to={getCell.to(puzzle)}
              className={`press relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-colors ${stateCls}`}
            >
              <span className={`text-[11px] leading-none ${lightMode ? "text-navyink-700/70" : "text-parchment-200/65"}`}>{dayNum}</span>
              {status.icon && <span className="mt-0.5 text-sm leading-none">{status.icon}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`px-4 py-5 ${lightMode ? "text-navyink-900" : "text-parchment-50"}`}>
      <div className="mx-auto w-full max-w-[460px]">
        {/* Title + Play random */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="font-serif text-3xl font-bold">Archives</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className={muted}>Play random:</span>
            <button onClick={() => goRandom(manifest, completedIds, "/")} className={`press rounded-full border px-3 py-1 ${pill}`}>Main</button>
            <button onClick={() => goRandom(quickManifest, quickCompletedIds, "/quick/")} className={`press rounded-full border px-3 py-1 ${pill}`}>Quick</button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="relative mb-4">
          <div className="flex items-center justify-between gap-2">
            <button onClick={goPrev} disabled={!canPrev} aria-label="Previous month" className={`press rounded-full border px-3 py-1.5 text-sm disabled:opacity-40 ${pill}`}>◀</button>
            <button onClick={openPicker} className={`press flex items-center gap-2 rounded-full border px-4 py-1.5 ${pill}`}>
              <span className="font-serif text-base font-bold">{monthLabel}</span>
              <span className={`text-[10px] transition-transform ${pickerOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            <button onClick={goNext} disabled={!canNext} aria-label="Next month" className={`press rounded-full border px-3 py-1.5 text-sm disabled:opacity-40 ${pill}`}>▶</button>
          </div>

          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className={`absolute left-1/2 top-full z-20 mt-2 w-[280px] -translate-x-1/2 rounded-2xl border p-3 ${lightMode ? "border-parchment-200 bg-parchment-50 shadow-card" : "border-navyink-700 bg-navyink-850 shadow-card-dark"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <button onClick={() => setPickerYear((y) => Math.max(minYear, y - 1))} disabled={pickerYear <= minYear} aria-label="Previous year" className={`press rounded-full border px-2.5 py-1 text-sm disabled:opacity-30 ${pill}`}>◀</button>
                  <span className="font-serif text-lg font-bold">{pickerYear}</span>
                  <button onClick={() => setPickerYear((y) => Math.min(maxYear, y + 1))} disabled={pickerYear >= maxYear} aria-label="Next year" className={`press rounded-full border px-2.5 py-1 text-sm disabled:opacity-30 ${pill}`}>▶</button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS_SHORT.map((name, m) => {
                    const available = allowedMonthsForYear(pickerYear).includes(m);
                    const selected = pickerYear === current.year && m === current.month;
                    return (
                      <button
                        key={m}
                        disabled={!available}
                        onClick={() => pickMonth(m)}
                        className={`press rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "bg-brand-600 text-white"
                            : available
                              ? (lightMode ? "text-navyink-800 hover:bg-parchment-100" : "text-parchment-200 hover:bg-navyink-700")
                              : (lightMode ? "cursor-default text-navyink-700/25" : "cursor-default text-parchment-200/20")
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {err && <div className="mb-2 text-sm text-red-400">{err}</div>}
        {!months.length && !err && <div className={`mt-4 text-sm ${muted}`}>No puzzles found.</div>}

        {currentMonthData && (
          <div className="space-y-4">
            <Calendar
              accent="#2b4d72"
              label="Main Stepword Puzzles"
              getCell={Object.assign(
                (cell) => {
                  const puzzle = cell.puzzle;
                  return { puzzle, status: puzzle ? cellStatus("stepwords", puzzle.id, completedIds, mainStars, mainPerfect) : {} };
                },
                { to: (p) => `/${p.id}` }
              )}
            />
            <Calendar
              accent="#c79a2e"
              label="Quick Stepword Puzzles"
              getCell={Object.assign(
                (cell, iso) => {
                  const todayET = getTodayIsoInET();
                  const preview = isPreviewEnabled();
                  const puzzle = (preview || iso <= todayET) ? quickByDate.get(iso) || null : null;
                  return { puzzle, status: puzzle ? cellStatus("quickstep", puzzle.id, quickCompletedIds, quickStars, quickPerfect) : {} };
                },
                { to: (p) => `/quick/${p.id}` }
              )}
            />

            {/* Legend */}
            <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs ${muted}`}>
              <span>🤩 Perfect</span>
              <span>🌟 3 stars</span>
              <span>⭐️ 2 stars</span>
              <span>💫 1 star</span>
              <span>☆ 0 stars</span>
              <span>❌ Failed</span>
              <span>👟 In progress</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
