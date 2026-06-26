import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { formatDateWithDayOfWeek, getTodayIsoInET, isPreviewEnabled, getRecentDatesET, formatShortWeekday } from "../lib/date.js";
import { getInitialLightMode, saveLightModePreference } from "../lib/theme.js";
import { getStreak } from "../lib/streak.js";
import { readSet, readMap, cellStatus, isPuzzleSolved } from "../lib/puzzleStatus.js";
import HowToPlayModal from "../components/HowToPlayModal.jsx";
import SettingsModal from "../components/SettingsModal.jsx";

function pickToday(manifest) {
  const today = getTodayIsoInET();
  const preview = isPreviewEnabled();
  const available = manifest.filter((p) => preview || p.date <= today);
  if (available.length === 0) return null;
  return available.sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];
}

function readCompleted(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set((Array.isArray(arr) ? arr : []).map(String));
  } catch {
    return new Set();
  }
}

/* Decorative left-aligned staircase that echoes the real step-word ladder:
   each row adds one tile, and the newly added (rightmost) tile is the navy "step". */
/* Pick one nice-looking highlighted square per row: random, but avoid a flat
   vertical line by nudging away from the previous row's column. */
function pickHighlights(rows) {
  let prev = -1;
  return rows.map((count) => {
    let col = Math.floor(Math.random() * count);
    if (col === prev && count > 1) col = (col + 1 + Math.floor(Math.random() * (count - 1))) % count;
    prev = col;
    return col;
  });
}

function MiniStair({ light, variant = "gold" }) {
  const rows = [2, 3, 4];
  const { tone, dim } =
    variant === "brand"
      ? {
          tone: light ? "bg-brand-600" : "bg-brand-500",
          dim: light ? "bg-brand-600/35" : "bg-brand-500/30",
        }
      : {
          tone: light ? "bg-gold-500" : "bg-gold-400",
          dim: light ? "bg-gold-500/35" : "bg-gold-400/30",
        };
  const highlights = useMemo(() => pickHighlights(rows), []);
  return (
    <div className="flex flex-col gap-[3px]" aria-hidden>
      {rows.map((count, r) => (
        <div key={r} className="flex gap-[3px]">
          {Array.from({ length: count }).map((_, c) => (
            <span key={c} className={`h-[7px] w-[7px] rounded-[2px] ${c === highlights[r] ? tone : dim}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

const RECENT_ARCHIVE_DAYS = 7;

function weekDayTileCls(light) {
  return light
    ? "border-parchment-300 bg-parchment-100 text-navyink-800 hover:border-parchment-400 hover:bg-parchment-200"
    : "border-navyink-600 bg-navyink-850 text-parchment-200 hover:border-navyink-500 hover:bg-navyink-700";
}

function puzzleRowHoverCls(light) {
  return light ? "hover:bg-parchment-200" : "hover:bg-navyink-700";
}

function borderedCardHoverCls(light) {
  return light ? "hover:bg-parchment-200 hover:border-parchment-300" : "hover:bg-navyink-700 hover:border-navyink-600";
}

function WeekDayCell({ iso, puzzle, ns, completed, stars, times, perfect, light, onPlay }) {
  const weekday = formatShortWeekday(iso);

  if (!puzzle) {
    return (
      <div
        className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl border p-1 opacity-40 ${
          light ? "border-parchment-200 bg-parchment-100 text-navyink-700/60" : "border-navyink-700 bg-navyink-850 text-parchment-200/50"
        }`}
        aria-hidden
      >
        <span className="text-[11px] font-semibold leading-none">{weekday}</span>
      </div>
    );
  }

  const status = cellStatus(ns, puzzle.id, completed, stars, perfect, times);

  return (
    <button
      type="button"
      onClick={() => onPlay(puzzle.id)}
      className={`press flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border p-1 transition-colors ${weekDayTileCls(light)}`}
      aria-label={`${weekday}${status.solved ? ", complete" : ", not complete"}`}
    >
      <span className="text-[11px] font-semibold leading-none">{weekday}</span>
      <span
        className={`text-sm leading-none ${status.solved ? (light ? "text-gold-600" : "text-gold-300") : light ? "text-navyink-700/35" : "text-parchment-200/30"}`}
        aria-hidden
      >
        {status.solved ? "★" : "☆"}
      </span>
    </button>
  );
}

function ThisWeekStrip({
  light,
  muted,
  dates,
  puzzlesByDate,
  ns,
  completed,
  stars,
  times,
  perfect,
  onPlay,
  onMore,
  embedded = false,
}) {
  const shell = embedded
    ? "border-t px-3 py-2.5"
    : `mt-3 rounded-2xl border px-3 py-2.5 ${light ? "border-parchment-200 bg-parchment-50" : "border-navyink-700 bg-navyink-800"}`;
  const shellBorder = embedded ? (light ? "border-parchment-200" : "border-navyink-700") : "";

  return (
    <div className={`${shell} ${shellBorder}`}>
      <div className={`mb-2 text-xs font-medium ${muted}`}>Last 7 days</div>
      <div className="grid grid-cols-8 gap-1">
        {dates.map((iso) => (
          <WeekDayCell
            key={iso}
            iso={iso}
            puzzle={puzzlesByDate.get(iso)}
            ns={ns}
            completed={completed}
            stars={stars}
            times={times}
            perfect={perfect}
            light={light}
            onPlay={onPlay}
          />
        ))}
        <button
          type="button"
          onClick={onMore}
          className={`press flex min-h-[44px] flex-col items-center justify-center rounded-xl border transition-colors ${
            light
              ? "border-parchment-300 bg-parchment-100 text-navyink-700 hover:border-parchment-400 hover:bg-parchment-200"
              : "border-navyink-600 bg-navyink-850 text-parchment-200 hover:border-navyink-500 hover:bg-navyink-700"
          }`}
          aria-label="Browse all archives"
        >
          <span className="text-lg leading-none">···</span>
          <span className="mt-0.5 text-[9px] font-semibold leading-none">More</span>
        </button>
      </div>
    </div>
  );
}

const PROGRESS_STORAGE_KEYS = new Set([
  "stepwords-completed",
  "quickstep-completed",
  "stepwords-stars",
  "quickstep-stars",
  "stepwords-times",
  "quickstep-times",
  "stepwords-perfect",
  "quickstep-perfect",
]);

function Arrow({ light }) {
  return (
    <span className={`text-xl leading-none ${light ? "text-parchment-400" : "text-navyink-600"}`} aria-hidden>
      →
    </span>
  );
}

function StatsIcon({ light }) {
  const c = light ? "#2b4d72" : "#7fa0c2";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="13" width="4" height="7" rx="1" fill={c} />
      <rect x="10" y="8" width="4" height="12" rx="1" fill={c} />
      <rect x="17" y="4" width="4" height="16" rx="1" fill={c} />
    </svg>
  );
}

function SettingsIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StreakChip({ light, value, className = "" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-semibold tabular-nums ${
        light ? "border-parchment-300 bg-parchment-100 text-navyink-800" : "border-navyink-700 bg-navyink-850 text-parchment-100"
      } ${className}`}
      title={`${value} day streak`}
    >
      <span className="text-sm leading-none">🔥</span>
      {value}
    </span>
  );
}

function formatAuthorLine(author) {
  if (!author || author === "Unknown") return null;
  return `By ${author}`;
}

function puzzleSubtitle(author, steps) {
  const authorLine = formatAuthorLine(author);
  const stepsLine = steps != null && steps !== "" ? `${steps} Steps` : null;
  if (!authorLine && !stepsLine) return null;
  return (
    <>
      {authorLine && <span className="block">{authorLine}</span>}
      {stepsLine && <span className="block">{stepsLine}</span>}
    </>
  );
}

function RowCard({ light, card, muted, onClick, disabled = false, icon, title, subtitle, done = false, trailing = null, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`press flex w-full items-center gap-4 border p-4 text-left transition-colors disabled:opacity-60 disabled:hover:bg-transparent ${card} ${className}`}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-lg font-bold">
          {title}
          {done && <span className="ml-2 align-middle text-xs font-medium text-emerald-500">✓</span>}
        </span>
        <span className={`block text-sm ${muted}`}>{subtitle}</span>
      </span>
      {trailing}
      <Arrow light={light} />
    </button>
  );
}

function useArchiveStatus() {
  const readAll = () => ({
    mainCompleted: readSet("stepwords-completed"),
    mainStars: readMap("stepwords-stars"),
    mainTimes: readMap("stepwords-times"),
    mainPerfect: readSet("stepwords-perfect"),
    quickCompleted: readSet("quickstep-completed"),
    quickStars: readMap("quickstep-stars"),
    quickTimes: readMap("quickstep-times"),
    quickPerfect: readSet("quickstep-perfect"),
  });
  const [status, setStatus] = useState(readAll);
  useEffect(() => {
    const refresh = () => setStatus(readAll());
    const onStorage = (e) => {
      if (e.key && PROGRESS_STORAGE_KEYS.has(e.key)) refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    document.addEventListener("stepwords-puzzle-completed", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      document.removeEventListener("stepwords-puzzle-completed", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return status;
}

export default function Home() {
  const navigate = useNavigate();
  const [light, setLight] = useState(getInitialLightMode);
  const [daily, setDaily] = useState(null);
  const [quick, setQuick] = useState(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [quickStreak, setQuickStreak] = useState({ current: 0, longest: 0 });
  const [howTo, setHowTo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mainManifest, setMainManifest] = useState([]);
  const [quickManifest, setQuickManifest] = useState([]);
  const todayIso = getTodayIsoInET();
  const recentDates = useMemo(() => getRecentDatesET(RECENT_ARCHIVE_DAYS), [todayIso]);
  const {
    mainCompleted,
    mainStars,
    mainTimes,
    mainPerfect,
    quickCompleted,
    quickStars,
    quickTimes,
    quickPerfect,
  } = useArchiveStatus();
  const dailyDone = daily?.id != null && isPuzzleSolved(daily.id, mainCompleted, mainStars, mainTimes);
  const quickDone = quick?.id != null && isPuzzleSolved(quick.id, quickCompleted, quickStars, quickTimes);
  const mainByDate = useMemo(() => {
    const preview = isPreviewEnabled();
    const map = new Map();
    for (const p of mainManifest) {
      if (p.date && (preview || p.date <= todayIso)) map.set(p.date, p);
    }
    return map;
  }, [mainManifest, todayIso]);
  const quickByDate = useMemo(() => {
    const preview = isPreviewEnabled();
    const map = new Map();
    for (const p of quickManifest) {
      if (p.date && (preview || p.date <= todayIso)) map.set(p.date, p);
    }
    return map;
  }, [quickManifest, todayIso]);

  useEffect(() => {
    document.title = "Stepwords — Daily Anagram Ladder Word Game";
    setStreak(getStreak(false));
    setQuickStreak(getStreak(true));
    let alive = true;

    Promise.all([fetchManifest(), fetchQuickManifest()])
      .then(async ([mainList, quickList]) => {
        if (!alive) return;
        const mainMeta = pickToday(mainList);
        const quickMeta = pickToday(quickList);
        const mainDone = readCompleted("stepwords-completed");
        const quickDone = readCompleted("quickstep-completed");

        const wordCount = async (path) => {
          try {
            const r = await fetch(path);
            if (!r.ok) return null;
            const j = await r.json();
            return Array.isArray(j.rows) ? j.rows.length : null;
          } catch {
            return null;
          }
        };

        const [mainWords, quickWords] = await Promise.all([
          mainMeta ? wordCount(`/puzzles/${mainMeta.id}.json`) : null,
          quickMeta ? wordCount(`/quick/${quickMeta.id}.json`) : null,
        ]);
        if (!alive) return;

        setMainManifest(mainList);
        setQuickManifest(quickList);
        setDaily(
          mainMeta
            ? {
                id: mainMeta.id,
                date: mainMeta.date,
                author: mainMeta.author || null,
                words: mainWords,
                done: mainDone.has(String(mainMeta.id)),
              }
            : null
        );
        setQuick(
          quickMeta
            ? {
                id: quickMeta.id,
                date: quickMeta.date,
                author: quickMeta.author || null,
                words: quickWords,
                done: quickDone.has(String(quickMeta.id)),
              }
            : null
        );
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  // Auto-show How to Play on a user's very first visit (shared flag with the
  // puzzle page, so it only ever pops once regardless of where they land first).
  useEffect(() => {
    try {
      if (!localStorage.getItem("stepwords-how-to-play")) setHowTo(true);
    } catch {}
  }, []);

  const closeHowTo = () => {
    setHowTo(false);
    try { localStorage.setItem("stepwords-how-to-play", "true"); } catch {}
  };

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    saveLightModePreference(next);
    try {
      document.dispatchEvent(new CustomEvent("stepwords-settings-updated", { detail: { lightMode: next } }));
    } catch {}
  };

  const dateLabel = useMemo(
    () => formatDateWithDayOfWeek(daily?.date || undefined),
    [daily?.date]
  );

  const page = light ? "bg-parchment-100 text-navyink-900" : "bg-navyink-900 text-parchment-50";
  const card = light
    ? "bg-parchment-50 border-parchment-200 shadow-card"
    : "bg-navyink-800 border-navyink-700 shadow-card-dark";
  const muted = light ? "text-navyink-700/75" : "text-parchment-200/65";

  return (
    <div className={`min-h-[100dvh] w-full ${page} transition-colors duration-300`}>
      <div className="mx-auto w-full max-w-md px-5 pt-7 pb-12 sm:max-w-lg">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Stepwords</h1>
            <p className={`mt-1 text-sm ${muted}`}>{dateLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`press grid h-9 w-9 place-items-center rounded-full border text-base ${
                light
                  ? "border-parchment-200 bg-parchment-50 text-navyink-700 hover:bg-parchment-100"
                  : "border-navyink-700 bg-navyink-800 text-parchment-50 hover:bg-navyink-700"
              }`}
            >
              {light ? "☾" : "☀"}
            </button>
            <button
              onClick={() => setHowTo(true)}
              aria-label="How to Play"
              title="How to Play"
              className={`press grid h-9 w-9 place-items-center rounded-full border text-base font-bold ${
                light
                  ? "border-parchment-200 bg-parchment-50 text-navyink-700 hover:bg-parchment-100"
                  : "border-navyink-700 bg-navyink-800 text-parchment-50 hover:bg-navyink-700"
              }`}
            >
              ?
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              title="Settings"
              className={`press grid h-9 w-9 place-items-center rounded-full border text-base ${
                light
                  ? "border-parchment-200 bg-parchment-50 text-navyink-700 hover:bg-parchment-100"
                  : "border-navyink-700 bg-navyink-800 text-parchment-50 hover:bg-navyink-700"
              }`}
            >
              <SettingsIcon />
            </button>
          </div>
        </header>

        {/* Daily Puzzle */}
        <div className={`overflow-hidden rounded-2xl ${card}`}>
          <RowCard
            light={light}
            card=""
            muted={muted}
            onClick={() => daily && navigate(`/${daily.id}`)}
            disabled={!daily}
            className={`rounded-none border-0 shadow-none ${puzzleRowHoverCls(light)}`}
            icon={<span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${light ? "bg-parchment-100" : "bg-navyink-700"}`}><MiniStair light={light} variant="brand" /></span>}
            title="Daily Puzzle"
            done={dailyDone}
            subtitle={
              loading
                ? "Loading…"
                : daily
                  ? puzzleSubtitle(daily.author, daily.words)
                  : "Unavailable"
            }
            trailing={<StreakChip light={light} value={streak.current} />}
          />
          {!loading && (
            <ThisWeekStrip
              light={light}
              muted={muted}
              dates={recentDates}
              puzzlesByDate={mainByDate}
              ns="stepwords"
              completed={mainCompleted}
              stars={mainStars}
              times={mainTimes}
              perfect={mainPerfect}
              onPlay={(id) => navigate(`/${id}`)}
              onMore={() => navigate("/archives")}
              embedded
            />
          )}
        </div>

        {/* Quick Puzzle */}
        <div className={`mt-3 overflow-hidden rounded-2xl ${card}`}>
          <RowCard
            light={light}
            card=""
            muted={muted}
            onClick={() => quick && navigate(`/quick/${quick.id}`)}
            disabled={!quick}
            className={`rounded-none border-0 shadow-none ${puzzleRowHoverCls(light)}`}
            icon={<span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${light ? "bg-parchment-100" : "bg-navyink-700"}`}><MiniStair light={light} /></span>}
            title="Quick Puzzle"
            done={quickDone}
            subtitle={quick ? puzzleSubtitle(quick.author, quick.words ?? 5) : ""}
            trailing={<StreakChip light={light} value={quickStreak.current} />}
          />
          {!loading && (
            <ThisWeekStrip
              light={light}
              muted={muted}
              dates={recentDates}
              puzzlesByDate={quickByDate}
              ns="quickstep"
              completed={quickCompleted}
              stars={quickStars}
              times={quickTimes}
              perfect={quickPerfect}
              onPlay={(id) => navigate(`/quick/${id}`)}
              onMore={() => navigate("/archives")}
              embedded
            />
          )}
        </div>

        {/* Stats */}
        <RowCard light={light} card={card} muted={muted} onClick={() => navigate("/stats")} className={`mt-3 rounded-2xl ${borderedCardHoverCls(light)}`}
          icon={<span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${light ? "bg-parchment-100" : "bg-navyink-700"}`}><StatsIcon light={light} /></span>}
          title="Stats"
          subtitle="Streaks, stars & badges"
        />

        {/* Create */}
        <RowCard light={light} card={card} muted={muted} onClick={() => navigate("/create")} className={`mt-3 rounded-2xl ${borderedCardHoverCls(light)}`}
          icon={<span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl font-light ${light ? "bg-parchment-100 text-navyink-700" : "bg-navyink-700 text-parchment-50"}`}>+</span>}
          title="Create"
          subtitle="Submit your own puzzle"
        />

        {/* Footer: copyright & contact */}
        <footer className={`mt-8 flex flex-col items-center gap-1 text-xs ${muted}`}>
          <span>© 2025 Stepwords™. All rights reserved.</span>
          <a href="mailto:hello@stepwords.xyz" className={`hover:underline ${light ? "text-brand-700" : "text-brand-300"}`}>
            hello@stepwords.xyz
          </a>
        </footer>

      </div>

      {howTo && <HowToPlayModal onClose={closeHowTo} lightMode={light} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onLightModeChange={setLight} />}
    </div>
  );
}
