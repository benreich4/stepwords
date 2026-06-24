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
  maxWordLength = 7,     // longest word in puzzle (fallback when tileSizePx not provided)
  tileSizePx = null,     // when provided, use this instead of computing from viewport
  textSizePx = null,     // when provided with tileSizePx, use for font size
  isDiffExtra = false,   // highlight as the extra/step letter vs comparison row
  isDiffMissing = false, // highlight as a missing/unfilled letter in comparison row
  isDiffFilled = false,  // deemphasize letters already filled in comparison row
  isDiffAll = false,     // deemphasize entire row (initial hold before selecting target)
  lightMode = false,
  stepEmoji = '🪜',     // emoji to use for step indicator
  stepPulse = false,
}) {
  const COLOR_CLASSES = {
    G: "bg-[#6aaa64] border border-[#6aaa64] text-white",
    Y: "bg-[#c9b458] border border-[#c9b458] text-white",
  };
  const EMPTY_CLASSES = lightMode 
    ? "bg-white border-2 border-parchment-400 text-navyink-900 transition-colors duration-200" 
    : "bg-navyink-800 border-2 border-navyink-600 text-white transition-colors duration-200";
  const stateClass = state ? (COLOR_CLASSES[state] || EMPTY_CLASSES) : EMPTY_CLASSES;

  // Tile size: use tileSizePx when provided (from parent's viewport measurement), else fallback
  const tileSize = tileSizePx != null
    ? `${tileSizePx}px`
    : (() => {
        const isWide = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
        const isShortPuzzle = maxWordLength <= 8;
        const padding = isShortPuzzle ? '2rem' : '3rem';
        const gapWidth = maxWordLength > 1 ? `(${maxWordLength - 1} * 0.125rem)` : '0';
        const rawSize = `(100vw - ${padding} - ${gapWidth}) / ${maxWordLength}`;
        const tileMaxPx = isShortPuzzle ? (isWide ? 64 : 44) : (isWide ? 58 : 40);
        const tileMinPx = isWide ? 36 : 30;
        return `clamp(${tileMinPx}px, calc(${rawSize}), ${tileMaxPx}px)`;
      })();
  const textSize = textSizePx != null
    ? `${textSizePx}px`
    : tileSizePx != null
      ? `${Math.max(11, Math.min(22, tileSizePx * 0.46))}px`
      : (() => {
          const isWide = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
          const isShortPuzzle = maxWordLength <= 8;
          const padding = isShortPuzzle ? '2rem' : '3rem';
          const gapWidth = maxWordLength > 1 ? `(${maxWordLength - 1} * 0.125rem)` : '0';
          const rawSize = `(100vw - ${padding} - ${gapWidth}) / ${maxWordLength}`;
          const textMaxPx = isWide ? 22 : 16;
          const textScale = isWide ? 0.46 : 0.42;
          return `clamp(11px, calc(${rawSize} * ${textScale}), ${textMaxPx}px)`;
        })();
  
  const base =
    "relative inline-flex items-center justify-center border rounded-[8px] box-border " +
    "select-none uppercase font-crossword font-bold leading-none tracking-normal antialiased " +
    "aspect-square transition-all duration-300 ease-out";
  const hasChar = Boolean(char && char !== " ");
  const prevStateRef = useRef(state);
  const [isPopping, setIsPopping] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const hasParticles = (state === 'G' || state === 'Y') && particleTrigger > 0;
  const isElevated = isPopping || isGlowing || hasParticles;
  
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
      className={`letter-box ${base} ${stateClass} ${(isDiffAll || (hasChar && (isDiffExtra || isDiffFilled))) ? 'opacity-60' : ''} ${isElevated ? 'tile-elevated' : ''} ${isPopping ? 'tile-lock-flip will-change-transform' : ''} ${isGlowing && state === 'G' ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent will-change-shadow' : ''} ${isGlowing && state === 'Y' ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-transparent will-change-shadow' : ''} ${isTyping ? 'ring-2 ring-brand-400 ring-offset-1 ring-offset-transparent will-change-shadow' : ''}`}
      style={{
        width: tileSize,
        fontSize: textSize,
        transition: 'width 300ms ease-out, font-size 300ms ease-out',
        zIndex: isElevated ? 10 : 'auto',
      }}
    >
      {/* Particle burst effect */}
      {(state === 'G' || state === 'Y') && (
        <ParticleBurst trigger={particleTrigger} color={state === 'G' ? 'green' : 'yellow'} lightMode={lightMode} />
      )}
      <span>{char}</span>

      {/* Cursor highlight stays inside the box */}
      {isCursor && (
        <span className={`pointer-events-none absolute inset-[2px] rounded-[5px] border-2 ${lightMode ? 'border-brand-600' : 'border-brand-300'}`} />
      )}

      {/* Step badge (actual step, always visible when revealed) */}
      {showStep && (
        <span
          className={`pointer-events-none absolute bottom-[1px] right-[1px] select-none text-[8px] sm:text-[10px] md:text-xs leading-none ${stepPulse ? 'step-pulse' : ''}`}
          aria-hidden
        >
          {stepEmoji}
        </span>
      )}

      {/* User-placed temporary step badge (hard mode only, when actual step not revealed) */}
      {showUserStep && (
        <span
          className="pointer-events-none absolute bottom-[1px] right-[1px] select-none
                     text-[8px] sm:text-[10px] md:text-xs leading-none"
          aria-hidden
        >
          {stepEmoji}
        </span>
      )}
    </button>
  );
}
