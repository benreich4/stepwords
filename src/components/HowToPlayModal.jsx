import { useEffect, useMemo, useState } from "react";
import { computeStepIndices } from "../lib/gameUtils.js";

const EXAMPLE_WORDS = ["SOW", "OWES", "SWORE", "STEPWORD"];

export default function HowToPlayModal({ onClose, lightMode = false, stepEmoji = "🪜" }) {
  const [step, setStep] = useState(0);
  const stepCount = 4;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const exampleRows = useMemo(() => EXAMPLE_WORDS.map((w) => ({ answer: w })), []);
  const exampleStepIdx = useMemo(() => computeStepIndices(exampleRows), [exampleRows]);

  const panel = lightMode
    ? "border-parchment-200 bg-parchment-50 text-navyink-900"
    : "border-navyink-700 bg-navyink-850 text-parchment-50";
  const muted = lightMode ? "text-navyink-700/70" : "text-parchment-200/60";
  const exampleBg = lightMode ? "bg-parchment-100" : "bg-navyink-800";
  const btnPrimary = lightMode
    ? "bg-brand-700 hover:bg-brand-800"
    : "bg-brand-600 hover:bg-brand-500";
  const btnGhost = lightMode
    ? "border-parchment-300 text-navyink-700 hover:bg-parchment-100"
    : "border-navyink-600 text-parchment-200 hover:bg-navyink-700";

  const isLast = step === stepCount - 1;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h3 className="mb-2 font-serif text-lg font-bold">Build the ladder</h3>
            <p className={`text-sm leading-relaxed ${muted}`}>
              Each answer is an <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>anagram</strong> of
              the previous answer plus exactly one new letter.
            </p>
            <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
              Clues include word lengths — e.g.{" "}
              <span className="font-medium">Audit (3,2,2)</span> means{" "}
              <span className="font-medium">sit in on</span>.
            </p>
          </>
        );
      case 1:
        return (
          <>
            <h3 className="mb-2 font-serif text-lg font-bold">Spot the new letter</h3>
            <p className={`mb-3 text-sm leading-relaxed ${muted}`}>
              The {stepEmoji} marks where each new letter was added.
            </p>
            <div className={`rounded-2xl p-3 ${exampleBg}`}>
              <div className="flex flex-col items-start gap-1">
                {EXAMPLE_WORDS.map((word, i) => (
                  <div key={i} className="flex gap-0.5">
                    {word.split("").map((letter, j) => (
                      <div
                        key={j}
                        className="relative inline-flex h-7 w-7 select-none items-center justify-center rounded-[5px] border-2 border-[#5f9a5a] bg-[#6aaa64] font-serif text-xs font-semibold uppercase leading-none text-white"
                      >
                        <span>{letter}</span>
                        {i >= 1 && j === exampleStepIdx[i] && (
                          <span
                            className="pointer-events-none absolute bottom-0 right-0 select-none text-[9px] leading-none"
                            aria-hidden
                          >
                            {stepEmoji}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h3 className="mb-2 font-serif text-lg font-bold">Guess and submit</h3>
            <p className={`text-sm leading-relaxed ${muted}`}>
              Fill a row, then press <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Enter</strong> or{" "}
              <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Submit</strong>.
            </p>
            <ul className={`mt-3 space-y-2 text-sm ${muted}`}>
              <li>
                <span className="font-semibold text-[#6aaa64]">Green</span> — correct on the first try
              </li>
              <li>
                <span className="font-semibold text-[#bda64f]">Yellow</span> — needed extra guesses or hints
              </li>
            </ul>
          </>
        );
      case 3:
      default:
        return (
          <>
            <h3 className="mb-2 font-serif text-lg font-bold">Stars, streaks & modes</h3>
            <ul className={`space-y-2 text-sm leading-relaxed ${muted}`}>
              <li>
                <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Stars</strong> — fewer missteps
                and hints means more stars.
              </li>
              <li>
                <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Streak</strong> — solve before
                midnight ET to keep it going.
              </li>
              <li>
                <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Hard mode</strong> hides {stepEmoji}{" "}
                locations; <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Easy mode</strong> filters
                the keyboard.
              </li>
            </ul>
            <p className={`mt-3 text-xs ${muted}`}>
              Try the shorter daily Quick Puzzle for a warm-up.
            </p>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-navyink-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to Play"
        className={`relative z-10 w-full max-w-sm rounded-3xl border p-5 shadow-2xl animate-fade-in-up ${panel}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">How to Play</h2>
            <p className={`mt-0.5 text-xs ${muted}`}>
              {step + 1} of {stepCount}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${lightMode ? "text-navyink-700 hover:bg-parchment-100" : "text-parchment-200 hover:bg-navyink-700"}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-1 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: stepCount }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? `w-4 ${lightMode ? "bg-brand-700" : "bg-brand-500"}`
                  : `w-1.5 ${lightMode ? "bg-parchment-300" : "bg-navyink-600"}`
              }`}
            />
          ))}
        </div>

        <div className="min-h-[168px] pt-2">{renderStep()}</div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:invisible ${btnGhost}`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={isLast ? onClose : () => setStep((s) => s + 1)}
            className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${btnPrimary}`}
          >
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
