import { Outlet, Link, useLocation } from "react-router-dom";
// Inline analytics - no separate module needed
import { useEffect } from "react";

export default function App() {
  const location = useLocation();
  const isQuick = location.pathname.startsWith('/quick');

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
    <div className="min-h-screen w-screen bg-black text-gray-100">
      <header className="w-full px-2 py-1 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400">Stepwords, created by Ben Reich</span>
          <div className="flex items-center gap-3">
            <Link to={isQuick ? "/" : "/quick"} className="text-[10px] text-emerald-400 hover:underline">
              {isQuick ? "Try today’s main Stepword puzzle" : "Try today’s Quick Stepword puzzle"}
            </Link>
            <Link to="/archives" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
              Archives
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full">
        <Outlet />
      </main>
      
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