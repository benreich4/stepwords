import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function OnScreenKeyboard({ lightMode = false, onKeyPress, onEnter, onBackspace, disabledKeys = new Set(), filteredLetters = null, onResize, submitReady = false, submitButtonRef = null, collapsed = false, onToggleCollapse = () => {}, toggleRef = null }) {
  const [isTiny, setIsTiny] = useState(() => {
    try { return (typeof window !== 'undefined') && window.innerWidth <= 360; } catch { return false; }
  });
  useEffect(() => {
    const onResize = () => {
      try { setIsTiny(window.innerWidth <= 360); } catch {}
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['SUBMIT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  const handleKeyClick = (key) => {
    if (key === 'SUBMIT') {
      onEnter();
    } else if (key === 'BACKSPACE') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  const [pressedKey, setPressedKey] = useState(null);
  const pressFlashRef = useRef(null);

  const keyAllowed = (key) => {
    if (disabledKeys.has(key)) return false;
    if (key === 'SUBMIT' || key === 'BACKSPACE') return true;
    if (filteredLetters && !filteredLetters.includes(key)) return false;
    return true;
  };

  const releasePressedKey = () => {
    if (pressFlashRef.current) {
      clearTimeout(pressFlashRef.current);
      pressFlashRef.current = null;
    }
    setPressedKey(null);
  };

  const pressKey = (key) => {
    if (!keyAllowed(key)) return;
    if (pressFlashRef.current) clearTimeout(pressFlashRef.current);
    setPressedKey(key);
    handleKeyClick(key);
    pressFlashRef.current = setTimeout(() => {
      setPressedKey(null);
      pressFlashRef.current = null;
    }, 120);
  };

  useEffect(() => {
    const clear = () => releasePressedKey();
    window.addEventListener('pointerup', clear);
    window.addEventListener('touchend', clear, { passive: true });
    window.addEventListener('touchcancel', clear, { passive: true });
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('touchend', clear);
      window.removeEventListener('touchcancel', clear);
      window.removeEventListener('blur', clear);
      if (pressFlashRef.current) clearTimeout(pressFlashRef.current);
    };
  }, []);

  const getKeyClass = (key) => {
    const baseClass = "px-2 py-3 h-14 sm:h-10 xl:h-12 2xl:h-14 rounded-lg font-crossword font-bold tracking-normal select-none touch-manipulation text-sm xl:text-base transition-colors";
    const isPressed = pressedKey === key;

    if (key === 'SUBMIT') {
      const pulse = submitReady ? ' ring-2 ring-brand-300 ring-offset-1 ring-offset-transparent' : '';
      return lightMode
        ? `${baseClass} text-white text-xs${pulse} ${isPressed ? 'bg-brand-900' : 'bg-brand-700 hover:bg-brand-800'}`
        : `${baseClass} text-white text-xs${pulse} ${isPressed ? 'bg-brand-700' : 'bg-brand-600 hover:bg-brand-500'}`;
    }
    if (key === 'BACKSPACE') {
      return lightMode
        ? `${baseClass} border border-parchment-400 text-xs ${isPressed ? 'bg-parchment-300 text-navyink-700' : 'bg-parchment-200 text-navyink-700 hover:bg-parchment-300'}`
        : `${baseClass} text-xs ${isPressed ? 'bg-navyink-800 text-parchment-50' : 'bg-navyink-700 text-parchment-50 hover:bg-navyink-600'}`;
    }

    const isDisabled = disabledKeys.has(key);
    // Only filter letter keys; do not filter special keys like SUBMIT/BACKSPACE
    const isFiltered = filteredLetters && !filteredLetters.includes(key);

    if (lightMode) {
      return `${baseClass} ${
        isDisabled || isFiltered
          ? 'bg-parchment-100 text-navyink-900/25 cursor-not-allowed border border-parchment-200'
          : isPressed
            ? 'bg-parchment-200 text-navyink-900 border border-parchment-400 shadow-sm'
            : 'bg-white text-navyink-900 hover:bg-parchment-100 border border-parchment-400 shadow-sm'
      }`;
    }
    return `${baseClass} ${
      isDisabled || isFiltered
        ? 'bg-navyink-850 text-parchment-200/25 cursor-not-allowed'
        : isPressed
          ? 'bg-navyink-800 text-parchment-50'
          : 'bg-navyink-700 text-parchment-50 hover:bg-navyink-600'
    }`;
  };

  const rootRef = useRef(null);
  const contentOuterRef = useRef(null);
  const contentInnerRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    // Wait until the portal content is mounted so refs point at real DOM.
    if (!mounted || !rootRef.current) return;
    const el = rootRef.current;
    const ro = new ResizeObserver(() => {
      try { onResize && onResize(el.getBoundingClientRect().height); } catch {}
    });
    ro.observe(el);
    // initial
    try { onResize && onResize(el.getBoundingClientRect().height); } catch {}
    return () => ro.disconnect();
  }, [onResize, mounted]);

  // Measure inner content height for animated collapse/expand (max-height)
  useEffect(() => {
    // Wait until the portal content is mounted so refs point at real DOM.
    if (!mounted || !contentInnerRef.current) return;
    const node = contentInnerRef.current;
    const measure = () => {
      try {
        const h = node.scrollHeight;
        if (h > 0) setContentHeight(h);
      } catch {}
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(node);
    // initial
    measure();
    return () => ro.disconnect();
  }, [mounted]);

  const keyboard = (
    <div ref={rootRef} className={`fixed bottom-0 left-0 right-0 w-full border-t z-40 transition-[height,background-color] duration-300 ease-out ${lightMode ? 'bg-parchment-100/95 border-parchment-300 backdrop-blur-sm' : 'bg-navyink-850/95 border-navyink-700 backdrop-blur-sm'}`} style={{ touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Collapse handle (larger tap target; wrapper handles events) */}
      <div
        className="w-full flex items-center justify-center py-0.5 md:py-1"
        role="button"
        tabIndex={0}
        onPointerUp={()=> onToggleCollapse(!collapsed)}
        onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(!collapsed); } }}
      >
        <button
          ref={toggleRef}
          className={`px-2 py-0.5 md:px-3 md:py-1 text-xs md:text-sm rounded-full border pointer-events-none ${lightMode ? 'border-parchment-300 text-navyink-700' : 'border-navyink-600 text-parchment-200'}`}
          aria-label={collapsed ? 'Expand keyboard' : 'Collapse keyboard'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Keyboard content (animated collapse/expand via max-height & opacity) */}
      <div
        ref={contentOuterRef}
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{ maxHeight: collapsed ? 0 : contentHeight, opacity: collapsed ? 0 : 1 }}
      >
        <div ref={contentInnerRef}>
          <div className={`${isTiny ? 'px-1' : 'px-2 xl:px-4 2xl:px-6'} py-1 ${collapsed ? '' : 'kb-pop-in'}`}>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className={`flex justify-center ${isTiny ? 'gap-0.5' : 'gap-1'} mb-1`}>
                {row.map((key) => (
                  <button
                    key={key}
                    ref={key === 'SUBMIT' ? submitButtonRef : null}
                    onPointerDown={(e) => {
                      // Use pointer for mouse/pen; touch handled in onTouchStart to avoid missed taps on iOS
                      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
                      e.preventDefault();
                      pressKey(key);
                    }}
                    onPointerUp={() => releasePressedKey()}
                    onPointerLeave={() => releasePressedKey()}
                    onPointerCancel={() => releasePressedKey()}
                    onTouchStart={(e) => {
                      // Dedicated touch handler for iOS Chrome/Safari to improve rapid-tap reliability
                      e.preventDefault();
                      e.stopPropagation();
                      pressKey(key);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      releasePressedKey();
                      try { e.currentTarget.blur(); } catch {}
                    }}
                    onTouchCancel={(e) => {
                      e.preventDefault();
                      releasePressedKey();
                      try { e.currentTarget.blur(); } catch {}
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchMove={(e) => { e.preventDefault(); }}
                    disabled={disabledKeys.has(key) || (!['SUBMIT','BACKSPACE'].includes(key) && (filteredLetters && !filteredLetters.includes(key)))}
                    className={getKeyClass(key)}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      minWidth: key === 'SUBMIT' ? (isTiny ? '62px' : '70px') : key === 'BACKSPACE' ? (isTiny ? '54px' : '60px') : (isTiny ? '28px' : '32px'),
                      height: undefined
                    }}
                    tabIndex={-1}
                  >
                    {key === 'BACKSPACE' ? '⌫' : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(keyboard, document.body);
}
