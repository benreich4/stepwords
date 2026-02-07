import { useEffect, useRef, useState } from 'react';

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

  const getKeyClass = (key) => {
    const baseClass = "px-2 py-3 h-14 sm:h-10 xl:h-12 2xl:h-14 rounded font-semibold select-none touch-manipulation text-sm xl:text-base";
    
    if (key === 'SUBMIT' || key === 'BACKSPACE') {
      const pulse = key === 'SUBMIT' && submitReady ? ' animate-pulse ring-2 ring-emerald-400' : '';
      return lightMode
        ? `${baseClass} bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 border border-gray-300 text-xs${pulse}`
        : `${baseClass} bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-700 text-xs${pulse}`;
    }
    
    const isDisabled = disabledKeys.has(key);
    // Only filter letter keys; do not filter special keys like SUBMIT/BACKSPACE
    const isFiltered = filteredLetters && !filteredLetters.includes(key);
    
    if (lightMode) {
      return `${baseClass} ${
        isDisabled || isFiltered
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 border border-gray-300'
      }`;
    }
    return `${baseClass} ${isDisabled || isFiltered ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800'}`;
  };

  const rootRef = useRef(null);
  const contentOuterRef = useRef(null);
  const contentInnerRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    const ro = new ResizeObserver(() => {
      try { onResize && onResize(el.getBoundingClientRect().height); } catch {}
    });
    ro.observe(el);
    // initial
    try { onResize && onResize(el.getBoundingClientRect().height); } catch {}
    return () => ro.disconnect();
  }, [onResize]);

  // Measure inner content height for animated collapse/expand (max-height)
  useEffect(() => {
    if (!contentInnerRef.current) return;
    const node = contentInnerRef.current;
    const measure = () => {
      try {
        const h = node.scrollHeight;
        setContentHeight(h);
      } catch {}
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(node);
    // initial
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={`fixed bottom-0 left-0 right-0 w-full border-t z-20 transition-[height,background-color] duration-300 ease-out ${lightMode ? 'bg-white/90 border-gray-200' : 'bg-gray-900 border-gray-700'}`} style={{ touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}>
      {/* Collapse handle (larger tap target; wrapper handles events) */}
      <div
        className="w-full flex items-center justify-center py-0.5"
        role="button"
        tabIndex={0}
        onPointerUp={()=> onToggleCollapse(!collapsed)}
        onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(!collapsed); } }}
      >
        <button
          ref={toggleRef}
          className={`px-2 py-0.5 text-xs rounded border pointer-events-none ${lightMode ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
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
                      const isDisabled = disabledKeys.has(key);
                      const isSpecial = (key === 'SUBMIT' || key === 'BACKSPACE');
                      const isFiltered = filteredLetters && !filteredLetters.includes(key);
                      if (!isDisabled && (isSpecial || !isFiltered)) {
                        handleKeyClick(key);
                      }
                    }}
                    onTouchStart={(e) => {
                      // Dedicated touch handler for iOS Chrome/Safari to improve rapid-tap reliability
                      e.preventDefault();
                      e.stopPropagation();
                      const isDisabled = disabledKeys.has(key);
                      const isSpecial = (key === 'SUBMIT' || key === 'BACKSPACE');
                      const isFiltered = filteredLetters && !filteredLetters.includes(key);
                      if (!isDisabled && (isSpecial || !isFiltered)) {
                        handleKeyClick(key);
                      }
                    }}
                    onTouchMove={(e) => { e.preventDefault(); }}
                    disabled={disabledKeys.has(key) || (!['SUBMIT','BACKSPACE'].includes(key) && (filteredLetters && !filteredLetters.includes(key)))}
                    className={getKeyClass(key)}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
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
          {/* Copyright notice */}
          <div className={`px-3 pt-3 pb-1 text-xs ${lightMode ? 'text-gray-500 border-t border-gray-200' : 'text-gray-500 border-t border-gray-700'} ${collapsed ? '' : 'kb-pop-in'}`} style={{ animationDelay: collapsed ? undefined : '60ms' }}>
            <div className="flex justify-between items-center gap-6 min-w-0">
              <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[60vw]">© 2025 Stepwords™. All rights reserved.</span>
              <a 
                href="mailto:hello@stepwords.xyz"
                className="text-sky-400 hover:underline whitespace-nowrap"
              >
                hello@stepwords.xyz
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
