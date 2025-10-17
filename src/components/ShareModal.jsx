import { useState } from "react";
import { Link } from "react-router-dom";

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
}) {
  const [notice, setNotice] = useState("");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 overflow-y-auto py-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-900 to-black p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold text-white">{didFail ? 'Too many missteps' : 'You solved it!'}</div>
          {!didFail && (hintCount === 0 && wrongGuessCount === 0) && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-700 text-white border border-emerald-500">Perfect!</span>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
            <div className="text-gray-400">Guesses</div>
            <div className="text-lg font-semibold text-gray-100">{guessCount}/{rowsLength}</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
            <div className="text-gray-400">Lifelines used</div>
            <div className="text-lg font-semibold text-gray-100">{hintCount}</div>
          </div>
          {Number.isFinite(stars) && !didFail && (
            <div className="col-span-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3 flex items-center justify-between">
              <div className="text-gray-400">Stars</div>
              <div className="text-xl font-semibold text-yellow-300">{'★'.repeat(Math.max(0,Math.min(3,stars||0)))}{'☆'.repeat(Math.max(0,3-(stars||0)))}</div>
            </div>
          )}
        </div>

        <pre className="whitespace-pre-wrap text-2xl leading-snug mb-4 p-3 rounded-lg border border-gray-700 bg-gray-900/60">
          {shareText}
        </pre>

        <div className="mb-3 text-center">
          <p className="text-sm text-gray-300 mb-2">Would love to hear your thoughts and ideas!</p>
          <a 
            href="mailto:hello@stepwords.xyz"
            className="text-sm text-sky-400 hover:underline"
          >
            hello@stepwords.xyz
          </a>
          <div className="mt-3">
            <Link
              to="/archives"
              className="inline-block text-sm text-emerald-400 hover:underline"
              onClick={() => {
                try { onClose?.(); } catch {}
              }}
            >
              Try another puzzle from the archives!
            </Link>
          </div>
          <div className="mt-2">
          <Link 
              to={isQuick ? "/" : "/quick"}
              className="inline-block text-sm text-emerald-400 hover:underline"
            onClick={() => {
              try {
                if (window.gtag && typeof window.gtag === 'function') {
                  window.gtag('event', 'cta_navigate', { target: isQuick ? 'main' : 'quick', source: 'completion_modal', mode: isQuick ? 'quick' : 'main' });
                }
              } catch {}
              try { onClose?.(); } catch {}
            }}
            >
              {isQuick ? "Try today’s main Stepword puzzle" : "Try today’s Quick Stepword puzzle"}
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
                  const composed = `${header}${starLine}\n\n${shareText}\n\nhttps://stepwords.xyz`;
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
              className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-200 text-sm hover:bg-gray-800"
            >
              Close
            </button>
            {notice && (
              <span className="text-xs text-emerald-400">{notice}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
