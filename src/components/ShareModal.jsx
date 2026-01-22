import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET } from "../lib/date.js";

export default function ShareModal({
  shareText,
  hintCount,
  wrongGuessCount,
  guessCount,
  rowsLength,
  onClose,
  isQuick = false,
  stars = null,
  didFail = false,
  elapsedTime = null,
  onShare = null,
  lightMode = false,
}) {
  const [notice, setNotice] = useState("");
  const [ctaHref, setCtaHref] = useState(isQuick ? "/" : "/quick");
  const [ctaText, setCtaText] = useState(isQuick ? "Try today’s Main Stepword Puzzle" : "Try today’s Quick Stepword Puzzle");
  // Determine if this is today's puzzle in ET
  const { isTodayET, puzzleDateText } = (() => {
    try {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      // Expect the page to have puzzle date in document.title e.g., "(..., September 19, 2025)"
      const m = document.title.match(/\((\w+,\s+\w+\s+\d{1,2},\s+\d{4})\)$/);
      if (!m) return { isTodayET: false, puzzleDateText: null };
      const dt = new Date(m[1]);
      const y = dt.getFullYear();
      const mm = String(dt.getMonth()+1).padStart(2,'0');
      const dd = String(dt.getDate()).padStart(2,'0');
      const iso = `${y}-${mm}-${dd}`;
      return { isTodayET: iso === today, puzzleDateText: m[1] };
    } catch {
      return { isTodayET: false, puzzleDateText: null };
    }
  })();

  const hasTime = Boolean(elapsedTime && !didFail);

  // Handle ESCAPE key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Determine CTA destination: if today's target mode is already solved, link to most recent unsolved; else link to today's in target mode
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = getTodayIsoInET();
        if (isQuick) {
          // Link to today's Main if unsolved, otherwise to most recent unsolved Main
          const list = await fetchManifest();
          const completed = new Set(JSON.parse(localStorage.getItem('stepwords-completed') || '[]'));
          const available = list.filter(p => p.date <= today);
          const todayMeta = available.find(p => p.date === today);
          if (todayMeta && !completed.has(todayMeta.id)) {
            if (!cancelled) { setCtaHref(`/${todayMeta.id}`); setCtaText("Try today’s Main Stepword Puzzle"); }
            return;
          }
          // pick most recent unsolved
          const recentUnsolved = available.slice().reverse().find(p => !completed.has(p.id));
          if (recentUnsolved) {
            if (!cancelled) { setCtaHref(`/${recentUnsolved.id}`); setCtaText("Try an unsolved puzzle from the archives!"); }
          } else {
            if (!cancelled) { setCtaHref('/archives'); setCtaText("Try an unsolved puzzle from the archives!"); }
          }
        } else {
          // From Main → target Quick
          const list = await fetchQuickManifest();
          const completed = new Set(JSON.parse(localStorage.getItem('quickstep-completed') || '[]'));
          const available = list.filter(p => p.date <= today);
          const todayMeta = available.find(p => p.date === today);
          if (todayMeta && !completed.has(todayMeta.id)) {
            if (!cancelled) { setCtaHref(`/quick/${todayMeta.id}`); setCtaText("Try today’s Quick Stepword Puzzle"); }
            return;
          }
          const recentUnsolved = available.slice().reverse().find(p => !completed.has(p.id));
          if (recentUnsolved) {
            if (!cancelled) { setCtaHref(`/quick/${recentUnsolved.id}`); setCtaText("Try an unsolved puzzle from the archives!"); }
          } else {
            if (!cancelled) { setCtaHref('/archives'); setCtaText("Try an unsolved puzzle from the archives!"); }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isQuick]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 overflow-y-auto py-6">
      <div className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl max-h-[85vh] overflow-y-auto ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gradient-to-b from-gray-900 to-black'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xl font-semibold ${lightMode ? 'text-gray-900' : 'text-white'}`}>{didFail ? 'Too many missteps' : 'You solved it!'}</div>
          {!didFail && (hintCount === 0 && wrongGuessCount === 0) && (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${lightMode ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-700 text-white border-emerald-500'}`}>Perfect!</span>
          )}
        </div>

        {/* Primary CTA – move user to today's other puzzle (prominent) */}
        <div className="mb-3">
          <Link
            to={ctaHref}
            className="block w-full text-center px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            onClick={() => {
              try {
                if (window.gtag && typeof window.gtag === 'function') {
                  const target = ctaHref.startsWith('/quick') ? 'quick' : (ctaHref === '/archives' ? 'archives' : 'main');
                  window.gtag('event', 'cta_navigate', { target, source: 'completion_modal_top', mode: isQuick ? 'quick' : 'main' });
                }
              } catch {}
              try { onClose?.(); } catch {}
            }}
          >
            {ctaText}
          </Link>
        </div>

        <div className={`mb-3 grid gap-2 text-sm ${hasTime ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900/60'}`}>
            <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Guesses</div>
            <div className={`text-lg font-semibold ${lightMode ? 'text-gray-900' : 'text-gray-100'}`}>{guessCount}/{rowsLength}</div>
          </div>
          <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900/60'}`}>
            <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Hints used</div>
            <div className={`text-lg font-semibold ${lightMode ? 'text-gray-900' : 'text-gray-100'}`}>{hintCount}</div>
          </div>
          {hasTime && (
            <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900/60'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Time</div>
              <div className={`text-lg font-semibold ${lightMode ? 'text-gray-900' : 'text-gray-100'}`}>{elapsedTime}</div>
            </div>
          )}
          {Number.isFinite(stars) && !didFail && (
            <div className={`${hasTime ? 'col-span-3' : 'col-span-2'} rounded-lg border p-3 flex items-center justify-between ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-700 bg-gray-900/60'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Stars</div>
              <div className="text-xl font-semibold text-yellow-400">{'★'.repeat(Math.max(0,Math.min(3,stars||0)))}{'☆'.repeat(Math.max(0,3-(stars||0)))}</div>
            </div>
          )}
        </div>

        <pre className={`whitespace-pre-wrap text-2xl leading-snug mb-4 p-3 rounded-lg border ${lightMode ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-700 bg-gray-900/60 text-gray-100'}`}>
          {shareText}
        </pre>

        <div className="mb-3 text-center">
          <p className={`text-sm mb-2 ${lightMode ? 'text-gray-700' : 'text-gray-300'}`}>Would love to hear your thoughts and ideas!</p>
          <a 
            href="mailto:hello@stepwords.xyz"
            className={`text-sm hover:underline ${lightMode ? 'text-sky-600' : 'text-sky-400'}`}
          >
            hello@stepwords.xyz
          </a>
          <div className="mt-3">
            <Link
              to="/archives"
              className={`inline-block text-sm hover:underline ${lightMode ? 'text-emerald-700' : 'text-emerald-400'}`}
              onClick={() => {
                try { onClose?.(); } catch {}
              }}
            >
              Try another puzzle from the archives!
            </Link>
          </div>
          
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href="https://stepwords.xyz"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-sky-400 hover:underline"
          >
            stepwords.xyz
          </a>
          <div className="flex gap-2 items-center">
            <button
              onClick={async () => {
                try {
                  onShare && onShare();
                } catch {}
                try {
                  const header = didFail
                    ? (isQuick
                        ? (isTodayET
                            ? "I tried today's Quick Stepword Puzzle."
                            : (puzzleDateText ? `I tried the Quick Stepword Puzzle for ${puzzleDateText}.` : "I tried the Quick Stepword Puzzle."))
                        : (isTodayET
                            ? "I tried today's Stepword Puzzle."
                            : (puzzleDateText ? `I tried the Stepword Puzzle for ${puzzleDateText}.` : "I tried the Stepword Puzzle.")))
                    : (isQuick
                        ? (isTodayET
                            ? "I solved today's Quick Stepword Puzzle!"
                            : (puzzleDateText ? `I solved the Quick Stepword Puzzle for ${puzzleDateText}!` : "I solved the Quick Stepword Puzzle!"))
                        : (isTodayET
                            ? "I solved today's Stepword Puzzle!"
                            : (puzzleDateText ? `I solved the Stepword Puzzle for ${puzzleDateText}!` : "I solved the Stepword Puzzle!")));
                  const starLine = (!didFail && Number.isFinite(stars)) ? `\nStars: ${'★'.repeat(Math.max(0,Math.min(3,stars||0)))}${'☆'.repeat(Math.max(0,3-(stars||0)))}` : '';
                  const timeLine = (elapsedTime && !didFail) ? `\nTime: ${elapsedTime}` : '';
                  const composed = `${header}${starLine}${timeLine}\n\n${shareText}\n\nhttps://stepwords.xyz${isQuick ? '/quick' : ''}`;
                  await navigator.clipboard.writeText(composed);
                  setNotice("Message copied to clipboard");
                } catch {
                  setNotice("Copy failed");
                }
              }}
              className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
            >
              Share
            </button>
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-md border text-sm ${lightMode ? 'border-gray-300 text-gray-800 hover:bg-gray-100' : 'border-gray-700 text-gray-200 hover:bg-gray-800'}`}
            >
              Close
            </button>
            {notice && (
              <span className={`text-xs ${lightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>{notice}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
