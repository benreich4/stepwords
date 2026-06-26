import { useEffect, useMemo, useState } from "react";
import { computeStepIndices } from "../lib/gameUtils.js";

const EXAMPLE_WORDS = ["SOW", "OWES", "SWORE", "POWERS", "POWDERS", "STEPWORD"];

function ExamplePuzzle({ words, stepIdx, stepEmoji, exampleBg }) {
  return (
    <div className={`rounded-2xl p-3 ${exampleBg}`}>
      <div className="flex flex-col items-start gap-1">
        {words.map((word, i) => (
          <div key={i} className="flex gap-0.5">
            {word.split("").map((letter, j) => (
              <div
                key={j}
                className="relative inline-flex h-7 w-7 select-none items-center justify-center rounded-[5px] border-2 border-[#5f9a5a] bg-[#6aaa64] font-serif text-[11px] font-semibold uppercase leading-none text-white sm:h-7 sm:w-7 sm:text-xs"
              >
                <span>{letter}</span>
                {i >= 1 && j === stepIdx[i] && (
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
  );
}

export default function HowToPlayModal({ onClose, lightMode = false, stepEmoji = "🪜" }) {
  const [step, setStep] = useState(0);
  const stepCount = 5;

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
  const body = `text-sm leading-relaxed ${muted}`;

  const isLast = step === stepCount - 1;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-3">
            <p className={body}>
              Each answer is an anagram of the previous answer plus exactly one new letter.
            </p>
            <ExamplePuzzle
              words={EXAMPLE_WORDS}
              stepIdx={exampleStepIdx}
              stepEmoji={stepEmoji}
              exampleBg={exampleBg}
            />
            <p className={body}>
              The {stepEmoji} indicates the location of the new letter in each answer.
            </p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <p className={body}>
              Each answer has a clue. Clues include word lengths for multi-word answers. For example,{" "}
              <span className="font-medium">Audit (3,2,2)</span> could be a clue for{" "}
              <span className="font-medium">sit in on</span>.
            </p>
            <p className={body}>
              Remember that clues will match in tense, number, and tone. The answer can usually be a direct
              replacement for the clue — like in a crossword puzzle.
            </p>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <p className={body}>
              After you enter a word, you can hit <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Submit</strong> (or{" "}
              <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Enter</strong> on your keyboard). The letters for the
              currently selected answer will turn:
            </p>
            <ul className={`space-y-2 ${body}`}>
              <li>
                <span className="font-semibold text-[#6aaa64]">Green</span> — correct on the first try
              </li>
              <li>
                <span className="font-semibold text-[#bda64f]">Yellow</span> — needed extra guesses or hints
              </li>
            </ul>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <p className={body}>
              Tap the <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Hints</strong> button for help. There are three types:
            </p>
            <ul className={`space-y-2.5 ${body}`}>
              <li>
                <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Word starts</strong> — reveals
                the starting letters of all answers, alphabetically. You can extend to longer prefixes.
              </li>
              <li>
                <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Lifelines</strong> — reveal
                groups of letters across every row at once (first, last, middle, or first/last/step letters). Each
                lifeline can only be used once per puzzle.
              </li>
              <li>
                <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Reveal</strong> — reveal a
                single letter or an entire word in the row you're working on.
              </li>
            </ul>
          </div>
        );
      case 4:
      default:
        return (
          <ul className={`space-y-2.5 ${body}`}>
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
              locations.
            </li>
            <li>
              <strong className={lightMode ? "text-navyink-900" : "text-parchment-50"}>Easy mode</strong> filters the
              keyboard.
            </li>
          </ul>
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

        <div className="min-h-[200px] pt-2">{renderStep()}</div>

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
