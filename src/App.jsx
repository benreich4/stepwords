import { Outlet, Link, useLocation } from "react-router-dom";
import { trackPageView } from "./lib/analytics.js";
import { useEffect } from "react";

export default function App() {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    const pageName = location.pathname.split('/')[1] || 'Home';
    trackPageView(pageName);
  }, [location]);

  return (
    <div className="min-h-screen w-screen bg-black text-gray-100">
      <header className="w-full px-3 py-2 border-b border-gray-800">
        <Link to="/" className="text-lg font-semibold">Stepword Puzzles – by Ben Reich</Link>
      </header>
      <main className="w-full">
        <Outlet />
      </main>
      
      {/* Copyright notice */}
      <footer className="w-full px-3 py-2 text-center text-xs text-gray-500 border-t border-gray-800">
        © 2025 Stepwords™. All rights reserved.
      </footer>
    </div>
  );
}