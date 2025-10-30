import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchManifest } from "./lib/puzzles.js";
import { fetchQuickManifest } from "./lib/quickPuzzles.js";
import { getTodayIsoInET } from "./lib/date.js";
import SharePromptModal from "./components/SharePromptModal.jsx";
// Inline analytics - no separate module needed

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isQuick = location.pathname.startsWith('/quick');
  const isArchives = location.pathname.startsWith('/archives');
  const isStats = location.pathname.startsWith('/stats');
  const [mainTarget, setMainTarget] = useState("/");
  const [quickTarget, setQuickTarget] = useState("/quick");
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('stepwords-header-collapsed') === '1'; } catch { return false; }
  });
  const [lightMode, setLightMode] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}'); return s.lightMode === true; } catch { return false; }
  });
  const [showSharePrompt, setShowSharePrompt] = useState(false);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'stepwords-header-collapsed') {
        try { setHeaderCollapsed(localStorage.getItem('stepwords-header-collapsed') === '1'); } catch {}
      }
      if (e.key === 'stepwords-settings') {
        try { const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}'); setLightMode(s.lightMode === true); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    const onCustom = () => {
      try { setHeaderCollapsed(localStorage.getItem('stepwords-header-collapsed') === '1'); } catch {}
    };
    document.addEventListener('stepwords-header-toggle', onCustom);
    const onSettingsUpdated = (e) => {
      if (e && e.detail && typeof e.detail.lightMode === 'boolean') {
        setLightMode(e.detail.lightMode);
        return;
      }
      try { const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}'); setLightMode(s.lightMode === true); } catch {}
    };
    document.addEventListener('stepwords-settings-updated', onSettingsUpdated);
    return () => { window.removeEventListener('storage', onStorage); document.removeEventListener('stepwords-header-toggle', onCustom); document.removeEventListener('stepwords-settings-updated', onSettingsUpdated); };
  }, []);

  // Track page views
  useEffect(() => {
    const pageName = location.pathname.split('/')[1] || 'Home';
    // Track page view
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', { page_name: pageName });
      }
    } catch (_err) { void 0; }
  }, [location]);

  // First-visit redirect: on the very first app load, send users to Quick
  useEffect(() => {
    try {
      if (localStorage.getItem('stepwords-first-visit') === '1') return;
      // mark before navigating to avoid loops
      localStorage.setItem('stepwords-first-visit', '1');
      if (!isQuick) {
        navigate('/quick', { replace: true });
      }
    } catch {}
  }, []);

  // Keep date when switching between Main and Quick
  useEffect(() => {
    let cancelled = false;
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const onMainPuzzle = !isQuick && segments.length === 1 && segments[0] && !["archives","create","explore","submissions","stats"].includes(segments[0]);
    const onQuickPuzzle = isQuick && segments.length === 2 && segments[0] === 'quick' && segments[1];

    const today = getTodayIsoInET();

    if (onMainPuzzle) {
      const mainId = segments[0];
      Promise.all([fetchManifest(), fetchQuickManifest()])
        .then(([mainList, quickList]) => {
          if (cancelled) return;
          const mainMeta = mainList.find(p => String(p.id) === String(mainId));
          const date = mainMeta?.date;
          const q = date ? quickList.find(qp => qp.date === date) : null;
          setQuickTarget(q ? `/quick/${q.id}` : "/quick");
          setMainTarget(`/${mainId}`);
        })
        .catch(() => {
          if (!cancelled) { setQuickTarget("/quick"); setMainTarget(`/${mainId}`); }
        });
      return () => { cancelled = true; };
    }

    if (onQuickPuzzle) {
      const quickId = segments[1];
      Promise.all([fetchManifest(), fetchQuickManifest()])
        .then(([mainList, quickList]) => {
          if (cancelled) return;
          const quickMeta = quickList.find(p => String(p.id) === String(quickId));
          const date = quickMeta?.date;
          const m = date ? mainList.find(mp => mp.date === date) : null;
          setMainTarget(m ? `/${m.id}` : "/");
          setQuickTarget(`/quick/${quickId}`);
        })
        .catch(() => {
          if (!cancelled) { setMainTarget("/"); setQuickTarget(`/quick/${quickId}`); }
        });
      return () => { cancelled = true; };
    }

    // On index pages, link to today's corresponding puzzle when available
    Promise.all([fetchManifest(), fetchQuickManifest()])
      .then(([mainList, quickList]) => {
        if (cancelled) return;
        const mToday = mainList.find(p => p.date === today);
        const qToday = quickList.find(p => p.date === today);
        setMainTarget(mToday ? `/${mToday.id}` : "/");
        setQuickTarget(qToday ? `/quick/${qToday.id}` : "/quick");
      })
      .catch(() => { if (!cancelled) { setMainTarget("/"); setQuickTarget("/quick"); } });

    return () => { cancelled = true; };
  }, [location.pathname]);

  // Dedicated users share prompt (5+ solves across Main + Quick), show once
  useEffect(() => {
    try {
      if (localStorage.getItem('stepwords-share-nudge') === '1') return;
      const mainCompleted = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
      const quickCompleted = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
      const solved = new Set([...(Array.isArray(mainCompleted) ? mainCompleted : []), ...(Array.isArray(quickCompleted) ? quickCompleted : [])]);
      if (solved.size >= 5) {
        setTimeout(() => setShowSharePrompt(true), 600);
      }
    } catch {}
  }, []);

  // Preview token handler: visiting ?preview=on sets a local flag for early access
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('preview') === 'on') {
      try { localStorage.setItem('stepwords-preview', '1'); } catch (_e) { void 0; }
    }
    if (params.get('preview') === 'off') {
      try { localStorage.removeItem('stepwords-preview'); } catch (_e) { void 0; }
    }
  }, [location.search]);

  return (
    <div className={`min-h-screen w-screen ${lightMode ? 'bg-white text-gray-900' : 'bg-black text-gray-100'}`}>
      <header
        className={`w-full px-2 py-1 border-b ${lightMode ? 'bg-white border-gray-300' : 'bg-black border-gray-800'}`}
        onClick={(e) => {
          // Toggle collapse when clicking the header bar background, but ignore clicks on interactive elements
          const tgt = e.target;
          if (tgt && (tgt.closest('a') || tgt.closest('button'))) return;
          const next = !headerCollapsed;
          setHeaderCollapsed(next);
          try {
            if (next) localStorage.setItem('stepwords-header-collapsed','1'); else localStorage.removeItem('stepwords-header-collapsed');
          } catch {}
          try { document.dispatchEvent(new CustomEvent('stepwords-header-toggle')); } catch {}
        }}
      >
        <div className="grid grid-cols-3 items-center">
          <div className="justify-self-start min-w-0">
            <div className="flex items-center gap-1">
              <Link 
                to={mainTarget} 
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                  (!isQuick && !isArchives && !isStats)
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : (lightMode ? 'bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                }`}
              >
                Main
              </Link>
              <Link 
                to={quickTarget} 
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                  (isQuick && !isArchives)
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : (lightMode ? 'bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                }`}
              >
                Quick
              </Link>
            </div>
          </div>
          <div className="justify-self-center">
            {!isArchives && !isStats && (
              <button
                onClick={() => {
                  const next = !headerCollapsed;
                  setHeaderCollapsed(next);
                  try {
                    if (next) localStorage.setItem('stepwords-header-collapsed','1'); else localStorage.removeItem('stepwords-header-collapsed');
                  } catch {}
                  try { document.dispatchEvent(new CustomEvent('stepwords-header-toggle')); } catch {}
                }}
                className={`text-[10px] px-2 py-0.5 rounded border ${lightMode ? 'text-gray-600 border-gray-300 hover:bg-gray-200' : 'text-gray-400 border-gray-800 hover:bg-gray-900'}`}
                aria-label={headerCollapsed ? 'Expand header' : 'Collapse header'}
              >
                {headerCollapsed ? '▼' : '▲'}
              </button>
            )}
          </div>
          <div className="justify-self-end min-w-0">
            <Link 
              to="/stats" 
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors whitespace-nowrap inline-flex items-center justify-center ${
                isStats
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : (lightMode ? 'border-gray-300 bg-gray-200 text-gray-800 hover:bg-gray-300' : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white')
              }`}
            >
              Stats
            </Link>
            <Link 
              to="/archives" 
              className={`ml-2 px-2 py-0.5 rounded text-[10px] border transition-colors whitespace-nowrap inline-flex items-center justify-center ${
                isArchives
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : (lightMode ? 'border-gray-300 bg-gray-200 text-gray-800 hover:bg-gray-300' : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white')
              }`}
            >
              Archives
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full">
        <Outlet />
      </main>

      {showSharePrompt && (
        <SharePromptModal onClose={() => setShowSharePrompt(false)} lightMode={lightMode} />
      )}
      
      {/* Copyright notice */}
      <footer className="w-full px-3 py-2 text-xs text-gray-500 border-t border-gray-800">
        <div className="flex justify-between items-center">
          <span>© 2025 Stepwords™. All rights reserved.</span>
          <a 
            href="mailto:hello@stepwords.xyz"
            className="text-sky-400 hover:underline"
          >
            hello@stepwords.xyz
          </a>
        </div>
      </footer>
    </div>
  );
}