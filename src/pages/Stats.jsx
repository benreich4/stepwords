import { useEffect, useMemo, useState } from "react";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET } from "../lib/date.js";
import { getAllStreaks } from "../lib/streak.js";
import { getInitialLightMode, readLightMode } from "../lib/theme.js";
import BadgesDisplay from "../components/BadgesDisplay.jsx";

function formatAvg(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StarsHistogram({ counts = {}, lightMode }) {
  const maxCount = Math.max(counts[0] || 0, counts[1] || 0, counts[2] || 0, counts[3] || 0);
  const barWidth = (n) => (maxCount > 0 ? Math.max((counts[n] || 0) / maxCount * 100, counts[n] > 0 ? 6 : 0) : 0);
  const track = lightMode ? "bg-parchment-200" : "bg-navyink-700";
  return (
    <div className="space-y-1.5">
      {[3, 2, 1, 0].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div className="w-7 text-right text-xs font-medium tabular-nums">{n}★</div>
          <div className={`h-2.5 flex-1 overflow-hidden rounded-full ${track}`}>
            <div className="h-full rounded-full bg-gold-400 transition-all duration-500" style={{ width: `${barWidth(n)}%` }} />
          </div>
          <div className="w-7 text-right text-xs tabular-nums">{counts[n] || 0}</div>
        </div>
      ))}
    </div>
  );
}

export default function Stats() {
  const [mainTotal, setMainTotal] = useState(0);
  const [quickTotal, setQuickTotal] = useState(0);
  const [streaks, setStreaks] = useState(() => getAllStreaks());
  const [lightMode, setLightMode] = useState(getInitialLightMode);
  const today = getTodayIsoInET();

  useEffect(() => {
    document.title = "Stepwords — Stats";
    (async () => {
      try {
        const list = await fetchManifest();
        setMainTotal(list.filter((p) => p.date <= today).length);
      } catch {}
      try {
        const list = await fetchQuickManifest();
        setQuickTotal(list.filter((p) => p.date <= today).length);
      } catch {}
    })();
    const onSettings = () => {
      try { const s = JSON.parse(localStorage.getItem("stepwords-settings") || "{}"); setLightMode(readLightMode(s)); } catch {}
    };
    const onComplete = () => setStreaks(getAllStreaks());
    document.addEventListener("stepwords-settings-updated", onSettings);
    document.addEventListener("stepwords-puzzle-completed", onComplete);
    return () => {
      document.removeEventListener("stepwords-settings-updated", onSettings);
      document.removeEventListener("stepwords-puzzle-completed", onComplete);
    };
  }, [today]);

  const readSet = (key) => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
  const readMap = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };

  const mainCompleted = useMemo(() => readSet("stepwords-completed"), []);
  const quickCompleted = useMemo(() => readSet("quickstep-completed"), []);
  const mainStars = useMemo(() => readMap("stepwords-stars"), []);
  const quickStars = useMemo(() => readMap("quickstep-stars"), []);
  const mainTimes = useMemo(() => readMap("stepwords-times"), []);
  const quickTimes = useMemo(() => readMap("quickstep-times"), []);

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  const collectTimes = (timesMap, ns, completedSet) => {
    const fromMap = Object.values(timesMap || {})
      .map((v) => (v && typeof v === "object" && Number.isFinite(v.elapsedMs) ? v.elapsedMs : typeof v === "string" ? parseFloat(v) : v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (fromMap.length) return fromMap;
    const vals = [];
    for (const id of completedSet || []) {
      try {
        const obj = JSON.parse(localStorage.getItem(`${ns}-${id}`) || "null");
        const ms = obj && Number.isFinite(obj.elapsedMs) ? obj.elapsedMs : obj?.timer?.elapsedMs;
        if (Number.isFinite(ms) && ms > 0) vals.push(ms);
      } catch {}
    }
    return vals;
  };
  const avg = (vals) => (vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null);

  const histo = (map) => {
    const h = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const k in map) { const v = map[k]; if (v >= 0 && v <= 3) h[v] = (h[v] || 0) + 1; }
    return h;
  };

  const card = lightMode ? "border-parchment-200 bg-parchment-50 shadow-card" : "border-navyink-700 bg-navyink-800 shadow-card-dark";
  const tile = lightMode ? "border-parchment-200 bg-parchment-100" : "border-navyink-700 bg-navyink-850";
  const muted = lightMode ? "text-navyink-700/65" : "text-parchment-200/55";

  const Section = ({ title, accent, streak, completed, total, starsMap, times, startMsg }) => (
    <div className={`rounded-3xl border p-5 ${card}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
        <h2 className="font-serif text-xl font-bold">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`rounded-2xl border p-3 ${tile}`}>
          <div className={`text-xs ${muted}`}>Current streak</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">🔥 {streak.current}</div>
        </div>
        <div className={`rounded-2xl border p-3 ${tile}`}>
          <div className={`text-xs ${muted}`}>Longest streak</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{streak.longest}</div>
        </div>
        <div className={`rounded-2xl border p-3 ${tile}`}>
          <div className={`text-xs ${muted}`}>Solved</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{pct(completed.size, total)}%</div>
          <div className={`text-xs ${muted}`}>{completed.size}/{total}</div>
        </div>
        <div className={`rounded-2xl border p-3 ${tile}`}>
          <div className={`text-xs ${muted}`}>Avg time</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{formatAvg(avg(collectTimes(times, title.includes("Quick") ? "quickstep" : "stepwords", completed)))}</div>
        </div>
      </div>

      <div className={`mt-3 rounded-2xl border p-4 ${tile}`}>
        <div className={`mb-2 text-xs ${muted}`}>Star distribution</div>
        <StarsHistogram counts={histo(starsMap)} lightMode={lightMode} />
      </div>

      {streak.current === 0 && <div className={`mt-3 text-xs ${muted}`}>{startMsg}</div>}
    </div>
  );

  return (
    <div className={`min-h-[60vh] px-4 py-6 ${lightMode ? "text-navyink-900" : "text-parchment-50"}`}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="font-serif text-3xl font-bold">Stats</h1>
        <Section title="Main Puzzle" accent="#2b4d72" streak={streaks.main} completed={mainCompleted} total={mainTotal} starsMap={mainStars} times={mainTimes} startMsg="Solve today's main puzzle to start a streak!" />
        <Section title="Quick Puzzle" accent="#c79a2e" streak={streaks.quick} completed={quickCompleted} total={quickTotal} starsMap={quickStars} times={quickTimes} startMsg="Solve today's quick puzzle to start a streak!" />

        <div className={`rounded-3xl border p-5 ${card}`}>
          <h2 className="mb-3 font-serif text-xl font-bold">Badges</h2>
          <BadgesDisplay lightMode={lightMode} />
        </div>
      </div>
    </div>
  );
}
