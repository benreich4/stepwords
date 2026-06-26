import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { formatDateWithDayOfWeek, getTodayIsoInET } from "../lib/date.js";
import { shouldSendAnalytics } from "../lib/autosolveUtils.js";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getOrCreateUserId, submitRating, modeFromNamespace } from "../lib/ratings.js";
import { pickTodayPuzzle, readSet } from "../lib/puzzleStatus.js";
import RatingIntroPopup from "./RatingIntroPopup.jsx";

const RATING_INTRO_SEEN_KEY = "stepwords-rating-intro-seen";
const RATINGS_KEY = (ns) => `${ns}-ratings`;

function StatColumn({ label, children, lightMode, bordered }) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center px-1 py-2.5 ${bordered ? (lightMode ? "border-l border-parchment-200" : "border-l border-navyink-700") : ""}`}>
      <div className={`font-sans text-lg font-bold tabular-nums leading-none ${lightMode ? "text-navyink-900" : "text-parchment-50"}`}>
        {children}
      </div>
      <div className={`mt-1 text-[9px] font-medium uppercase tracking-wider ${lightMode ? "text-navyink-700/55" : "text-parchment-200/50"}`}>
        {label}
      </div>
    </div>
  );
}

const STAR_FILLED = "#FFD700";
const STAR_EMPTY_LIGHT = "#D8C9AB";
const STAR_EMPTY_DARK = "#4A6080";

function StarRating({ count, lightMode, max = 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < count;
        const fill = filled ? STAR_FILLED : lightMode ? STAR_EMPTY_LIGHT : STAR_EMPTY_DARK;
        return (
          <svg key={i} viewBox="0 0 24 24" width="20" height="20" className="shrink-0" aria-hidden>
            <path
              fill={fill}
              style={{ fill }}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        );
      })}
    </span>
  );
}

function ShareIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ShareGridVisual({ rows, colors, lightMode }) {
  if (!rows?.length) return null;
  const emptyCls = lightMode ? "bg-parchment-200" : "bg-navyink-700";
  return (
    <div className="inline-flex flex-col gap-[3px]" aria-label="Puzzle result grid">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-[3px]">
          {Array.from({ length: row.answer.length }, (_, c) => {
            const tok = colors?.[i]?.[c];
            const cls =
              tok === "G"
                ? "bg-[#6aaa64]"
                : tok === "Y"
                  ? "bg-[#c9b458]"
                  : emptyCls;
            return <div key={c} className={`h-3 w-3 shrink-0 ${cls}`} />;
          })}
        </div>
      ))}
    </div>
  );
}

export default function ShareModal({
  shareText,
  hintCount,
  wrongGuessCount,
  guessCount,
  onClose,
  isQuick = false,
  stars = null,
  didFail = false,
  elapsedTime = null,
  onShare = null,
  lightMode = false,
  puzzleId = null,
  puzzleNamespace = null,
  puzzleDate = null,
  streak = null,
  personalBestHighlights = [],
  perfectWeek = null,
  shareRows = null,
  shareGridColors = null,
}) {
  const [notice, setNotice] = useState("");
  const ns = puzzleNamespace || (isQuick ? "quickstep" : "stepwords");
  const ratingsKey = RATINGS_KEY(ns);

  const [showRatingIntro, setShowRatingIntro] = useState(() => {
    if (!puzzleId || didFail) return false;
    try {
      return localStorage.getItem(RATING_INTRO_SEEN_KEY) !== "1";
    } catch {
      return false;
    }
  });

  const [rating, setRating] = useState(() => {
    if (!puzzleId) return null;
    try {
      const map = JSON.parse(localStorage.getItem(ratingsKey) || "{}");
      const r = map[puzzleId];
      return typeof r === "number" && r >= 1 && r <= 5 ? r : null;
    } catch {
      return null;
    }
  });

  const [todayCta, setTodayCta] = useState(null);

  const saveRating = (value) => {
    if (!puzzleId) return;
    try {
      const map = JSON.parse(localStorage.getItem(ratingsKey) || "{}");
      map[puzzleId] = value;
      localStorage.setItem(ratingsKey, JSON.stringify(map));
    } catch {}
  };

  const dismissRatingIntro = () => {
    setShowRatingIntro(false);
    try {
      localStorage.setItem(RATING_INTRO_SEEN_KEY, "1");
    } catch {}
  };

  const handleRate = async (value) => {
    const previousRating = rating;
    setRating(value);
    saveRating(value);
    try {
      const userId = getOrCreateUserId();
      const mode = modeFromNamespace(ns);
      await submitRating(puzzleId, mode, value, userId);
    } catch {}
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === "function") {
        window.gtag("event", "puzzle_rated", {
          puzzle_id: puzzleId || "unknown",
          mode: modeFromNamespace(ns),
          rating: value,
          value,
          is_rating_change: previousRating !== null,
          hint_count: hintCount,
          guess_count: guessCount,
          stars: Number.isFinite(stars) ? stars : null,
        });
      }
    } catch {}
  };

  const puzzleDateText = (() => {
    if (puzzleDate) return formatDateWithDayOfWeek(puzzleDate);
    try {
      const m = document.title.match(/\((\w+,\s+\w+\s+\d{1,2},\s+\d{4})\)$/);
      return m ? m[1] : formatDateWithDayOfWeek(getTodayIsoInET());
    } catch {
      return formatDateWithDayOfWeek(getTodayIsoInET());
    }
  })();

  const isTodayET = (() => {
    try {
      const today = getTodayIsoInET();
      if (puzzleDate) return puzzleDate === today;
      const m = document.title.match(/\((\w+,\s+\w+\s+\d{1,2},\s+\d{4})\)$/);
      if (!m) return false;
      const dt = new Date(m[1]);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return iso === today;
    } catch {
      return false;
    }
  })();

  const starCount = (() => {
    let s = stars;
    if (!Number.isFinite(s) && puzzleId) {
      try {
        const map = JSON.parse(localStorage.getItem(`${ns}-stars`) || "{}");
        if (Number.isFinite(map[puzzleId])) s = map[puzzleId];
      } catch {}
    }
    return Math.max(0, Math.min(3, s || 0));
  })();
  const streakCount = streak?.current > 0 ? streak.current : 0;

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setTodayCta(null);
    (async () => {
      try {
        if (isQuick) {
          const list = await fetchManifest();
          const completed = readSet("stepwords-completed");
          const todayMeta = pickTodayPuzzle(list);
          if (todayMeta?.id != null && !completed.has(String(todayMeta.id))) {
            if (!cancelled) {
              setTodayCta({ href: `/${todayMeta.id}`, text: "Try today's Daily puzzle" });
            }
          }
        } else {
          const list = await fetchQuickManifest();
          const completed = readSet("quickstep-completed");
          const todayMeta = pickTodayPuzzle(list);
          if (todayMeta?.id != null && !completed.has(String(todayMeta.id))) {
            if (!cancelled) {
              setTodayCta({ href: `/quick/${todayMeta.id}`, text: "Try today's Quick puzzle" });
            }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isQuick]);

  const handleShareClick = async () => {
    try {
      onShare && onShare();
    } catch {}
    try {
      const header = didFail
        ? isQuick
          ? isTodayET
            ? "I tried today's Quick Stepword Puzzle."
            : `I tried the Quick Stepword Puzzle for ${puzzleDateText}.`
          : isTodayET
            ? "I tried today's Stepword Puzzle."
            : `I tried the Stepword Puzzle for ${puzzleDateText}.`
        : isQuick
          ? isTodayET
            ? "I solved today's Quick Stepword Puzzle!"
            : `I solved the Quick Stepword Puzzle for ${puzzleDateText}!`
          : isTodayET
            ? "I solved today's Stepword Puzzle!"
            : `I solved the Stepword Puzzle for ${puzzleDateText}!`;
      const starLine = !didFail && Number.isFinite(stars) ? `\nStars: ${"★".repeat(starCount)}${"☆".repeat(3 - starCount)}` : "";
      const timeLine = elapsedTime && !didFail ? `\nTime: ${elapsedTime}` : "";
      const composed = `${header}${starLine}${timeLine}\n\n${shareText}\n\nhttps://stepwords.xyz${isQuick ? "/quick" : ""}`;
      await navigator.clipboard.writeText(composed);
      setNotice("Copied to clipboard");
    } catch {
      setNotice("Copy failed");
    }
  };

  const pageBg = lightMode ? "bg-parchment-100 text-navyink-900" : "bg-navyink-900 text-parchment-50";
  const cardBg = lightMode ? "bg-white shadow-card" : "bg-navyink-850 shadow-card-dark border border-navyink-700";
  const muted = lightMode ? "text-navyink-700/60" : "text-parchment-200/55";
  const accent = lightMode ? "text-navyink-700/70 hover:text-navyink-900" : "text-parchment-200/60 hover:text-parchment-100";
  const secondaryBtn = lightMode
    ? "border-parchment-300 bg-white text-navyink-800 hover:bg-parchment-50"
    : "border-navyink-600 bg-navyink-850 text-parchment-100 hover:bg-navyink-700";

  const closeAndNavigate = () => {
    try { onClose?.(); } catch {}
  };

  return createPortal(
    <>
      {showRatingIntro && (
        <RatingIntroPopup onClose={dismissRatingIntro} lightMode={lightMode} />
      )}
      <div className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto ${pageBg}`}>
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full text-lg transition-colors ${lightMode ? "text-navyink-700/50 hover:bg-parchment-200/80 hover:text-navyink-800" : "text-parchment-200/50 hover:bg-navyink-800 hover:text-parchment-100"}`}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="relative z-0 mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-5 py-8 text-center animate-fade-in-up">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            {didFail ? "Out of guesses" : "Solved!"}
          </h1>
          <p className={`mt-1 text-xs ${muted}`}>{puzzleDateText}</p>

          {puzzleId && !didFail && (
            <div className={`mt-4 w-full rounded-xl border px-3 py-2 ${lightMode ? "border-parchment-200 bg-white" : "border-navyink-700 bg-navyink-850"}`}>
              <p className={`mb-1 text-xs font-medium ${lightMode ? "text-navyink-700" : "text-parchment-200"}`}>Rate this puzzle</p>
              <div className="flex justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleRate(n)}
                    className="p-0.5 text-xl leading-none transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 rounded"
                    aria-label={`${n} ${n === 1 ? "heart" : "hearts"}`}
                    aria-pressed={rating === n}
                  >
                    {rating !== null && n <= rating ? "❤️" : "🤍"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex w-full justify-center">
            {shareRows?.length && shareGridColors ? (
              <ShareGridVisual rows={shareRows} colors={shareGridColors} lightMode={lightMode} />
            ) : (
              <pre className={`text-left font-mono text-xs leading-snug ${lightMode ? "text-navyink-800" : "text-parchment-100"}`}>
                {shareText}
              </pre>
            )}
          </div>

          {!didFail && (
            <div className={`mt-4 flex w-full overflow-hidden rounded-xl ${cardBg}`}>
              <StatColumn label="Time" lightMode={lightMode}>
                {elapsedTime || "—"}
              </StatColumn>
              <StatColumn label="Stars" lightMode={lightMode} bordered>
                <span aria-label={`${starCount} of 3 stars`}>
                  <StarRating count={starCount} lightMode={lightMode} />
                </span>
              </StatColumn>
              <StatColumn label="Day streak" lightMode={lightMode} bordered>
                {streakCount}
              </StatColumn>
            </div>
          )}

          {(personalBestHighlights?.length > 0 || perfectWeek?.isNew) && !didFail && (
            <div className={`mt-2 w-full space-y-0.5 text-xs font-medium ${lightMode ? "text-brand-700" : "text-brand-300"}`}>
              {personalBestHighlights?.map((msg) => (
                <p key={msg}>⚡ {msg}</p>
              ))}
              {perfectWeek?.isNew && <p>📅 Perfect week! 7 days at 3★</p>}
            </div>
          )}

          <button
            type="button"
            onClick={handleShareClick}
            className={`press mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${lightMode ? "bg-brand-800 hover:bg-brand-900" : "bg-brand-600 hover:bg-brand-500"}`}
          >
            <ShareIcon className="h-4 w-4" />
            Share
          </button>

          {notice && (
            <p className={`mt-1.5 text-xs ${lightMode ? "text-emerald-700" : "text-emerald-400"}`}>{notice}</p>
          )}

          <div className={`mt-3 grid w-full gap-2 ${todayCta ? "grid-cols-2" : "grid-cols-1"}`}>
            {todayCta && (
              <Link
                to={todayCta.href}
                onClick={() => {
                  try {
                    if (shouldSendAnalytics() && window.gtag && typeof window.gtag === "function") {
                      window.gtag("event", "cta_navigate", {
                        target: isQuick ? "main" : "quick",
                        source: "completion_modal",
                        mode: isQuick ? "quick" : "main",
                      });
                    }
                  } catch {}
                  closeAndNavigate();
                }}
                className={`press flex min-h-[2.5rem] min-w-0 items-center justify-center rounded-full px-2 py-2 text-[11px] font-semibold leading-tight text-white shadow-sm transition-colors ${lightMode ? "bg-emerald-700 hover:bg-emerald-800" : "bg-emerald-600 hover:bg-emerald-500"}`}
              >
                {todayCta.text}
              </Link>
            )}
            <Link
              to="/archives"
              onClick={closeAndNavigate}
              className={`press flex min-h-[2.5rem] min-w-0 items-center justify-center rounded-full border px-2 py-2 text-xs font-semibold transition-colors ${secondaryBtn}`}
            >
              Archives
            </Link>
          </div>

          <Link
            to="/"
            onClick={closeAndNavigate}
            className={`mt-4 text-xs font-medium transition-colors ${accent}`}
          >
            Back to home
          </Link>
        </div>
      </div>
    </>,
    document.body
  );
}
