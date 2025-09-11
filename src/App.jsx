import { Outlet, Link, useLocation } from "react-router-dom";
// Inline analytics - no separate module needed
import { useEffect } from "react";

export default function App() {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    const pageName = location.pathname.split('/')[1] || 'Home';
    // Track page view
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', { page_name: pageName });
      }
    } catch (error) {
      // Silently fail
    }
  }, [location]);

  return (
    <div className="min-h-screen w-screen bg-black text-gray-100">
      <header className="w-full px-3 py-2 border-b border-gray-800">
        <div className="flex justify-end">
          <Link to="/archives" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
            Archives
          </Link>
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