import { useEffect, useRef, useState } from "react";
import ParticleBurst from "./ParticleBurst.jsx";

export default function LetterBox({
  char = "",
  state = null,          // null or 'G' | 'Y'
  isCursor = false,
  onClick,
  showStep = false,      // show actual step ladder emoji
  showUserStep = false,  // show user-placed temporary step ladder emoji
  onContextMenu = null,  // right-click handler for temporary step ladder
  maxWordLength = 7,     // <-- NEW: longest word in puzzle
  isDiffExtra = false,   // highlight as the extra/step letter vs comparison row
  isDiffMissing = false, // highlight as a missing/unfilled letter in comparison row
  isDiffFilled = false,  // deemphasize letters already filled in comparison row
  isDiffAll = false,     // deemphasize entire row (initial hold before selecting target)
  lightMode = false,
  delayMs = 0,
  stepEmoji = '🪜',     // emoji to use for step indicator
}) {
  const COLOR_CLASSES = {
    G: lightMode 
      ? "bg-green-500 border-2 border-green-600 text-white shadow-md shadow-green-500/30" 
      : "bg-green-500 border-2 border-green-500 text-white shadow-md shadow-green-500/30",
    Y: lightMode 
      ? "bg-yellow-300 border-2 border-yellow-400 text-black shadow-md shadow-yellow-400/30" 
      : "bg-yellow-300 border-2 border-yellow-400 text-black shadow-md shadow-yellow-400/30",
  };
  const EMPTY_CLASSES = lightMode 
    ? "bg-gray-200 border-gray-400 text-gray-900 transition-colors duration-200" 
    : "bg-gray-800 border-gray-700 text-gray-200 transition-colors duration-200";
  const stateClass = state ? (COLOR_CLASSES[state] || EMPTY_CLASSES) : EMPTY_CLASSES;

  // Calculate dynamic tile size based on viewport and word length, with sane min/max caps
  // - Slightly reduce available width to account for borders/padding so no overflow on mobile
  // - Account for gap-0.5 (0.125rem) between letters: (maxWordLength - 1) gaps
  // - Mobile: ensure tiles aren't too small (min ~30px)
  // - Desktop: cap tiles so they don't get huge (max ~40px)
  // - For short puzzles (maxWordLength <= 8), allow tiles to be bigger
  const isWide = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(min-width: 1536px)').matches;
  const isShortPuzzle = maxWordLength <= 8;
  
  // Use less padding for short puzzles to allow bigger tiles
  const padding = isShortPuzzle ? '2rem' : '3rem';
  const gapWidth = maxWordLength > 1 ? `(${maxWordLength - 1} * 0.125rem)` : '0';
  const rawSize = `(100vw - ${padding} - ${gapWidth}) / ${maxWordLength}`;
  
  // Allow larger tiles for short puzzles (but not too big)
  const tileMaxPx = isShortPuzzle 
    ? (isWide ? 60 : 44)
    : (isWide ? 56 : 40);
  const tileMinPx = isWide ? 34 : 30;
  const textMaxPx = isWide ? 20 : 16;
  const textScale = isWide ? 0.45 : 0.42;
  const tileSize = `clamp(${tileMinPx}px, calc(${rawSize}), ${tileMaxPx}px)`;
  const textSize = `clamp(11px, calc(${rawSize} * ${textScale}), ${textMaxPx}px)`;
  
  const base =
    "relative inline-flex items-center justify-center border rounded-[6px] box-border " +
    "select-none uppercase font-bold leading-none " +
    "aspect-square transition-all duration-300 ease-out";
  const hasChar = Boolean(char && char !== " ");
  const prevStateRef = useRef(state);
  const [isPopping, setIsPopping] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const hasParticles = (state === 'G' || state === 'Y') && particleTrigger > 0;
  
  // Particle burst when state changes to G or Y
  useEffect(() => {
    if (state && state !== prevStateRef.current && (state === 'G' || state === 'Y')) {
      setIsPopping(true);
      setIsGlowing(true);
      setParticleTrigger(prev => prev + 1);
      const t1 = setTimeout(() => setIsPopping(false), 400);
      const t2 = setTimeout(() => setIsGlowing(false), 800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    prevStateRef.current = state;
  }, [state]);

  // Typing feedback - glow when cursor is on this letter
  useEffect(() => {
    if (isCursor && hasChar) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 200);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [isCursor, hasChar]);

  return (
    <button 
      type="button" 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`letter-box ${base} ${stateClass} ${(isDiffAll || (hasChar && (isDiffExtra || isDiffFilled))) ? 'opacity-60' : ''} ${isPopping ? 'scale-110 animate-bounce will-change-transform' : ''} ${isGlowing && state === 'G' ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent will-change-shadow' : ''} ${isGlowing && state === 'Y' ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-transparent will-change-shadow' : ''} ${isTyping ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent animate-pulse will-change-shadow' : ''}`}
      style={{
        width: tileSize,
        fontSize: textSize,
        transitionDelay: `${delayMs}ms`,
        zIndex: hasParticles ? 10 : 'auto', // Raise z-index when particles are active
      }}
    >
      {/* Particle burst effect */}
      {(state === 'G' || state === 'Y') && (
        <ParticleBurst trigger={particleTrigger} color={state === 'G' ? 'green' : 'yellow'} lightMode={lightMode} />
      )}
      <span>{char}</span>

      {/* Cursor highlight stays inside the box */}
      {isCursor && (
        <span className="pointer-events-none absolute inset-[2px] rounded-[4px] border-2 border-sky-400" />
      )}

      {/* Step badge (actual step, always visible when revealed) */}
      {showStep && (
        <span
          className="pointer-events-none absolute bottom-[1px] right-[1px] select-none
                     text-[8px] sm:text-[10px] md:text-[11px] leading-none"
          aria-hidden
        >
          {stepEmoji}
        </span>
      )}

      {/* User-placed temporary step badge (hard mode only, when actual step not revealed) */}
      {showUserStep && (
        <span
          className="pointer-events-none absolute bottom-[1px] right-[1px] select-none
                     text-[8px] sm:text-[10px] md:text-[11px] leading-none"
          aria-hidden
        >
          {stepEmoji}
        </span>
      )}
    </button>
  );
}
