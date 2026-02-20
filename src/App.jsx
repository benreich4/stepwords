import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchManifest } from "./lib/puzzles.js";
import { fetchQuickManifest } from "./lib/quickPuzzles.js";
import { getTodayIsoInET } from "./lib/date.js";
import { getInitialLightMode } from "./lib/theme.js";
import SharePromptModal from "./components/SharePromptModal.jsx";
import SubmissionPromptModal from "./components/SubmissionPromptModal.jsx";
// Inline analytics - no separate module needed

// Check if print mode is enabled via URL parameter
function isPrintMode() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('print') === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const printMode = isPrintMode();
  const isQuick = location.pathname.startsWith('/quick');
  const isArchives = location.pathname.startsWith('/archives');
  const isStats = location.pathname.startsWith('/stats');
  const isOther = location.pathname.startsWith('/other');
  const isPromo = location.pathname.startsWith('/promo');
  const [mainTarget, setMainTarget] = useState("/");
  const [quickTarget, setQuickTarget] = useState("/quick");
  const [currentMainId, setCurrentMainId] = useState(null);
  const [currentQuickId, setCurrentQuickId] = useState(null);
  const [mainCompleted, setMainCompleted] = useState(false);
  const [quickCompleted, setQuickCompleted] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('stepwords-header-collapsed') === '1'; } catch { return false; }
  });
  const [lightMode, setLightMode] = useState(() => {
    return getInitialLightMode();
  });
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showSubmissionPrompt, setShowSubmissionPrompt] = useState(false);
  const [hasSolvedFive, setHasSolvedFive] = useState(false);

  useEffect(() => {
    const checkCompletion = () => {
      try {
        const mainCompletedList = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
        const quickCompletedList = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
        setMainCompleted(currentMainId ? mainCompletedList.includes(String(currentMainId)) : false);
        setQuickCompleted(currentQuickId ? quickCompletedList.includes(String(currentQuickId)) : false);
      } catch {}
    };
    
    const onStorage = (e) => {
      if (e.key === 'stepwords-header-collapsed') {
        try { setHeaderCollapsed(localStorage.getItem('stepwords-header-collapsed') === '1'); } catch {}
      }
      if (e.key === 'stepwords-settings') {
        try { const s = JSON.parse(localStorage.getItem('stepwords-settings') || '{}'); setLightMode(s.lightMode === true); } catch {}
      }
      if (e.key === 'stepwords-completed' || e.key === 'quickstep-completed') {
        checkCompletion();
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
    
    // Also listen for custom completion events (for same-tab updates)
    const onCompletionUpdated = () => {
      checkCompletion();
    };
    document.addEventListener('stepwords-puzzle-completed', onCompletionUpdated);
    
    // Check completion whenever current puzzle IDs change
    checkCompletion();
    
    return () => { 
      window.removeEventListener('storage', onStorage); 
      document.removeEventListener('stepwords-header-toggle', onCustom); 
      document.removeEventListener('stepwords-settings-updated', onSettingsUpdated);
      document.removeEventListener('stepwords-puzzle-completed', onCompletionUpdated);
    };
  }, [currentMainId, currentQuickId]);

  // Enhanced traffic source tracking
  useEffect(() => {
    const pagePath = location.pathname + location.search;
    const pageName = location.pathname.split('/')[1] || 'Home';
    
    try {
      // Parse UTM parameters and referrer
      const urlParams = new URLSearchParams(location.search);
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');
      const utmTerm = urlParams.get('utm_term');
      const utmContent = urlParams.get('utm_content');
      
      // Get referrer information
      const referrer = document.referrer || '';
      const referrerHost = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : '';
      const isInternalReferrer = referrerHost === 'stepwords.xyz' || referrerHost === '';
      
      // Determine traffic source category
      let trafficSource = 'direct';
      let trafficMedium = 'none';
      let trafficCampaign = null;
      
      if (utmSource) {
        trafficSource = utmSource;
        trafficMedium = utmMedium || 'unknown';
        trafficCampaign = utmCampaign || null;
      } else if (referrer && !isInternalReferrer) {
        // Categorize referrer
        if (referrerHost.includes('google') || referrerHost.includes('bing') || referrerHost.includes('yahoo') || referrerHost.includes('duckduckgo')) {
          trafficSource = referrerHost;
          trafficMedium = 'organic';
        } else if (referrerHost.includes('facebook') || referrerHost.includes('twitter') || referrerHost.includes('reddit') || referrerHost.includes('linkedin') || referrerHost.includes('instagram')) {
          trafficSource = referrerHost;
          trafficMedium = 'social';
        } else {
          trafficSource = referrerHost;
          trafficMedium = 'referral';
        }
      } else if (isInternalReferrer && referrer) {
        trafficSource = 'internal';
        trafficMedium = 'internal';
      }
      
      // Store first-touch attribution (only on first visit)
      if (typeof window !== 'undefined' && !sessionStorage.getItem('stepwords-first-touch-tracked')) {
        sessionStorage.setItem('stepwords-first-touch-tracked', '1');
        try {
          const firstTouchData = {
            source: trafficSource,
            medium: trafficMedium,
            campaign: trafficCampaign,
            referrer: referrerHost || 'direct',
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem('stepwords-first-touch', JSON.stringify(firstTouchData));
        } catch {}
      }
      
      // Track page view with enhanced traffic source data
      // Skip analytics in autosolve mode or when noanalytics=1
      const params = new URLSearchParams(location.search || '');
      const isAutosolve = params.get('autosolve') === '1' || params.get('autosolve') === '2';
      const noAnalytics = params.get('noanalytics') === '1';
      
      if (!isAutosolve && !noAnalytics && window.gtag && typeof window.gtag === 'function') {
        const eventParams = {
          page_path: pagePath,
          page_location: window.location.href,
          page_title: document.title,
          page_name: pageName,
          // Traffic source data
          traffic_source: trafficSource,
          traffic_medium: trafficMedium,
          referrer_host: referrerHost || 'direct',
          is_internal_referrer: isInternalReferrer,
        };
        
        // Add UTM parameters if present
        if (utmSource) eventParams.utm_source = utmSource;
        if (utmMedium) eventParams.utm_medium = utmMedium;
        if (utmCampaign) eventParams.utm_campaign = utmCampaign;
        if (utmTerm) eventParams.utm_term = utmTerm;
        if (utmContent) eventParams.utm_content = utmContent;
        
        // Update config with page_path for proper session tracking
        window.gtag('config', 'G-K3HE6MH1XF', {
          page_path: pagePath,
          page_location: window.location.href,
        });
        
        // Send page_view event with enhanced parameters
        window.gtag('event', 'page_view', eventParams);
        
        // Also send a custom event for traffic source analysis
        window.gtag('event', 'traffic_source', {
          source: trafficSource,
          medium: trafficMedium,
          campaign: trafficCampaign || 'none',
          referrer_host: referrerHost || 'direct',
          is_internal: isInternalReferrer,
          has_utm: !!utmSource,
        });
      }
    } catch (_err) { void 0; }
  }, [location]);

  // Keep <link rel="canonical"> in sync with the current route (prevents "alternate page" issues)
  useEffect(() => {
    try {
      const origin = 'https://stepwords.xyz';
      const path = location && location.pathname ? location.pathname : '/';
      const canonicalHref = origin + (path === '/' ? '/' : path);
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      if (link.getAttribute('href') !== canonicalHref) {
        link.setAttribute('href', canonicalHref);
      }
    } catch (_e) { void 0; }
  }, [location && location.pathname]);

  // First-visit redirect: only if a brand-new user lands on the root path
  useEffect(() => {
    try {
      if (localStorage.getItem('stepwords-first-visit') === '1') return;
      // Mark first visit immediately so deep links won't trigger later redirects
      localStorage.setItem('stepwords-first-visit', '1');
      if (location.pathname === '/') {
        navigate('/quick', { replace: true });
      }
    } catch {}
  }, []);

  // Keep date when switching between Main and Quick
  useEffect(() => {
    let cancelled = false;
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const onMainPuzzle = !isQuick && segments.length === 1 && segments[0] && !["admin","archives","create","explore","privacy","stats","style-guide","submissions","terms","words"].includes(segments[0]);
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
          
          // Track current puzzle IDs for completion checking
          setCurrentMainId(mainId);
          setCurrentQuickId(q ? q.id : null);
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
          
          // Track current puzzle IDs for completion checking
          setCurrentMainId(m ? m.id : null);
          setCurrentQuickId(quickId);
        })
        .catch(() => {
          if (!cancelled) { setMainTarget("/"); setQuickTarget(`/quick/${quickId}`); }
        });
      return () => { cancelled = true; };
    }

    // On index pages or other pages (archives, stats, etc.), link to today's corresponding puzzle when available
    Promise.all([fetchManifest(), fetchQuickManifest()])
      .then(([mainList, quickList]) => {
        if (cancelled) return;
        const mToday = mainList.find(p => p.date === today);
        const qToday = quickList.find(p => p.date === today);
        setMainTarget(mToday ? `/${mToday.id}` : "/");
        setQuickTarget(qToday ? `/quick/${qToday.id}` : "/quick");
        
        // On non-puzzle pages (archives, stats, etc.), show today's completion status
        // On puzzle pages, the IDs are set above in onMainPuzzle/onQuickPuzzle handlers
        if (!onMainPuzzle && !onQuickPuzzle) {
          setCurrentMainId(mToday ? mToday.id : null);
          setCurrentQuickId(qToday ? qToday.id : null);
        }
      })
      .catch(() => { if (!cancelled) { setMainTarget("/"); setQuickTarget("/quick"); } });

    return () => { cancelled = true; };
  }, [location.pathname]);

  // Check if user has solved 5+ puzzles
  useEffect(() => {
    try {
      const mainCompleted = JSON.parse(localStorage.getItem('stepwords-completed') || '[]');
      const quickCompleted = JSON.parse(localStorage.getItem('quickstep-completed') || '[]');
      const solved = new Set([...(Array.isArray(mainCompleted) ? mainCompleted : []), ...(Array.isArray(quickCompleted) ? quickCompleted : [])]);
      const hasFive = solved.size >= 5;
      setHasSolvedFive(hasFive);
      
      if (hasFive) {
        // Show submission prompt first if they haven't seen it
        const submissionShown = localStorage.getItem('stepwords-submission-prompt-shown') === '1';
        const shareShown = localStorage.getItem('stepwords-share-nudge') === '1';
        
        if (!submissionShown) {
          setTimeout(() => setShowSubmissionPrompt(true), 600);
        } else if (!shareShown) {
          // Only show share prompt if submission prompt was already shown
          setTimeout(() => setShowSharePrompt(true), 600);
        }
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
      {!printMode && !isPromo && (
        <header
          className={`app-header w-full px-2 py-1 border-b ${lightMode ? 'bg-gray-100 border-gray-300' : 'bg-gray-900 border-gray-800'}`}
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
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors flex items-center gap-1 ${
                  (!isQuick && !isArchives && !isStats && !isOther)
                    ? 'bg-blue-500 border-blue-500 text-white shadow-sm' 
                    : (lightMode ? 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700')
                }`}
              >
                Main{mainCompleted && <span className="text-[8px]">✓</span>}
              </Link>
              <Link 
                to={quickTarget} 
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors flex items-center gap-1 ${
                  (isQuick && !isArchives)
                    ? 'bg-blue-500 border-blue-500 text-white shadow-sm' 
                    : (lightMode ? 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700')
                }`}
              >
                Quick{quickCompleted && <span className="text-[8px]">✓</span>}
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
              to="/create" 
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors whitespace-nowrap inline-flex items-center justify-center ${
                (lightMode ? 'border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700')
              }`}
              title="Create"
            >
              ✏️
            </Link>
            <Link 
              to="/stats" 
              className={`ml-2 px-2 py-0.5 rounded text-[10px] border transition-colors whitespace-nowrap inline-flex items-center justify-center ${
                isStats
                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                  : (lightMode ? 'border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700')
              }`}
              title="Stats"
            >
              %
            </Link>
            <Link 
              to="/archives" 
              className={`ml-2 px-2 py-0.5 rounded text-[10px] border transition-colors whitespace-nowrap inline-flex items-center justify-center ${
                isArchives
                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                  : (lightMode ? 'border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700')
              }`}
              title="Archives"
            >
              📁
            </Link>
          </div>
        </div>
        </header>
      )}
      <main className="w-full">
        <Outlet />
      </main>

      {!printMode && showSharePrompt && (
        <SharePromptModal onClose={() => setShowSharePrompt(false)} lightMode={lightMode} />
      )}
      
      {!printMode && showSubmissionPrompt && (
        <SubmissionPromptModal onClose={() => setShowSubmissionPrompt(false)} lightMode={lightMode} />
      )}
      
      {/* Copyright notice */}
      {!printMode && !isPromo && (
        <footer className="app-footer w-full px-3 py-2 text-xs text-gray-500 border-t border-gray-800">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span>© 2025 Stepwords™. All rights reserved.</span>
            <Link to="/privacy" className="text-sky-400 hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sky-400 hover:underline">
              Terms of Service
            </Link>
          </div>
          <a 
            href="mailto:hello@stepwords.xyz"
            className="text-sky-400 hover:underline"
          >
            hello@stepwords.xyz
          </a>
        </div>
        </footer>
      )}
    </div>
  );
}