import { useEffect, useMemo, useState } from "react";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET } from "../lib/date.js";
import { getAllStreaks } from "../lib/streak.js";
import { getInitialLightMode } from "../lib/theme.js";
import BadgesDisplay from "../components/BadgesDisplay.jsx";

function formatAvg(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function StarsHistogram({ counts = {}, lightMode }) {
  const total = (counts[0]||0)+(counts[1]||0)+(counts[2]||0)+(counts[3]||0);
  const pct = (n) => total ? Math.round((n/total)*100) : 0;
  const maxCount = Math.max(counts[0]||0, counts[1]||0, counts[2]||0, counts[3]||0);
  const barHeight = (n) => maxCount > 0 ? Math.max((counts[n]||0) / maxCount * 100, counts[n] > 0 ? 8 : 0) : 0;
  
  return (
    <div className="space-y-1">
      {[3, 2, 1, 0].map((n) => {
        const color = n === 3 ? 'bg-yellow-400' : n === 2 ? 'bg-yellow-300' : n === 1 ? 'bg-yellow-200' : 'bg-gray-400';
        const count = counts[n] || 0;
        return (
          <div key={n} className="flex items-center gap-1.5">
            <div className="w-6 text-[10px] text-right">{n}★</div>
            <div className={`flex-1 h-2 rounded ${lightMode ? 'bg-gray-200' : 'bg-gray-800'} overflow-hidden`}>
              <div className={`h-full ${color}`} style={{ width: `${barHeight(n)}%` }} />
            </div>
            <div className="w-8 text-[10px] text-right">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Stats() {
  const [mainTotal, setMainTotal] = useState(0);
  const [streaks, setStreaks] = useState(() => getAllStreaks());
  const [quickTotal, setQuickTotal] = useState(0);
  const [lightMode, setLightMode] = useState(() => {
    return getInitialLightMode();
  });
  const debugStats = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('statsdebug') === '1'; } catch { return false; }
  }, []);

  const today = getTodayIsoInET();

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchManifest();
        const available = list.filter(p => p.date <= today);
        setMainTotal(available.length);
      } catch {}
      try {
        const list = await fetchQuickManifest();
        const available = list.filter(p => p.date <= today);
        setQuickTotal(available.length);
      } catch {}
    })();
    const onSettings = () => {
      try { const s = JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); setLightMode(s.lightMode===true); } catch {}
    };
    // Refresh streaks when puzzle is completed
    const onComplete = () => {
      setStreaks(getAllStreaks());
    };
    document.addEventListener('stepwords-settings-updated', onSettings);
    document.addEventListener('stepwords-puzzle-completed', onComplete);
    return () => {
      document.removeEventListener('stepwords-settings-updated', onSettings);
      document.removeEventListener('stepwords-puzzle-completed', onComplete);
    };
  }, [today]);

  const mainCompleted = useMemo(() => { try { return new Set(JSON.parse(localStorage.getItem('stepwords-completed')||'[]')); } catch { return new Set(); } }, []);
  const quickCompleted = useMemo(() => { try { return new Set(JSON.parse(localStorage.getItem('quickstep-completed')||'[]')); } catch { return new Set(); } }, []);
  const mainStars = useMemo(() => { try { return JSON.parse(localStorage.getItem('stepwords-stars')||'{}'); } catch { return {}; } }, []);
  const quickStars = useMemo(() => { try { return JSON.parse(localStorage.getItem('quickstep-stars')||'{}'); } catch { return {}; } }, []);
  const mainTimes = useMemo(() => { try { return JSON.parse(localStorage.getItem('stepwords-times')||'{}'); } catch { return {}; } }, []);
  const quickTimes = useMemo(() => { try { return JSON.parse(localStorage.getItem('quickstep-times')||'{}'); } catch { return {}; } }, []);

  useEffect(() => {
    if (!debugStats) return;
    try {
      // Raw localStorage strings for verification
      const rawMain = localStorage.getItem('stepwords-times');
      const rawQuick = localStorage.getItem('quickstep-times');
      console.log('[Stats dbg] raw stepwords-times:', rawMain);
      console.log('[Stats dbg] raw quickstep-times:', rawQuick);
    } catch {}
    console.log('[Stats dbg] parsed mainTimes:', mainTimes);
    console.log('[Stats dbg] parsed quickTimes:', quickTimes);
    console.log('[Stats dbg] mainCompleted:', Array.from(mainCompleted || []));
    console.log('[Stats dbg] quickCompleted:', Array.from(quickCompleted || []));
  }, [debugStats]);

  const pct = (a,b) => b>0 ? Math.round((a/b)*100) : 0;
  const collectTimes = (timesMap, puzzleNamespace, completedSet, tag) => {
    const valsFromMap = Object.values(timesMap || {})
      .map((v) => {
        if (v && typeof v === 'object' && Number.isFinite(v.elapsedMs)) return v.elapsedMs;
        if (typeof v === 'string') return parseFloat(v);
        return v;
      })
      .filter((v) => Number.isFinite(v) && v > 0);
    if (valsFromMap.length) {
      if (debugStats) console.log('[Stats dbg] using map times for', tag, 'count=', valsFromMap.length);
      return valsFromMap;
    }
    const vals = [];
    if (completedSet && completedSet.size) {
      for (const id of completedSet) {
        try {
          const raw = localStorage.getItem(`${puzzleNamespace}-${id}`);
          if (!raw) continue;
          const obj = JSON.parse(raw);
          let ms = null;
          if (obj && Number.isFinite(obj.elapsedMs)) ms = obj.elapsedMs;
          else if (obj && obj.timer && Number.isFinite(obj.timer.elapsedMs)) ms = obj.timer.elapsedMs;
          if (Number.isFinite(ms) && ms > 0) vals.push(ms);
        } catch {}
      }
    }
    if (debugStats) console.log('[Stats dbg] fallback per-puzzle times for', tag, 'count=', vals.length);
    return vals;
  };

  const avgFromValues = (vals, tag) => {
    if (debugStats) console.log('[Stats dbg] avgFromValues input', tag, 'count=', vals.length, 'sample=', vals.slice(0,5));
    if (!vals.length) return null;
    const avg = Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
    if (debugStats) console.log('[Stats dbg] avgFromValues output', tag, 'avg=', avg);
    return avg;
  };

  const mainVals = collectTimes(mainTimes, 'stepwords', mainCompleted, 'main');
  const quickVals = collectTimes(quickTimes, 'quickstep', quickCompleted, 'quick');
  const mainAvg = avgFromValues(mainVals, 'main');
  const quickAvg = avgFromValues(quickVals, 'quick');

  const histo = (map) => {
    const h = {0:0,1:0,2:0,3:0};
    for (const k in map) {
      const v = map[k];
      if (v>=0 && v<=3) h[v] = (h[v]||0)+1;
    }
    return h;
  };
  const mainH = histo(mainStars);
  const quickH = histo(quickStars);

  return (
    <div className={`px-3 sm:px-4 py-4 flex justify-center ${lightMode ? 'text-gray-900' : 'text-gray-200'}`}>
      <div className="w-full max-w-3xl space-y-4">
        {/* Main Section */}
        <div className={`rounded-lg border p-4 ${lightMode ? 'border-blue-300 bg-blue-50' : 'border-blue-800 bg-blue-900/40'}`}>
          <div className="text-lg font-semibold mb-3">
            Main Puzzle
          </div>
          
          {/* Streak */}
          <div className={`rounded border p-3 mb-3 ${lightMode ? 'border-gray-300 bg-gray-50' : 'border-gray-800 bg-gray-900/40'}`}>
            <div className={`${lightMode ? 'text-gray-700' : 'text-gray-300'} text-sm mb-2 font-semibold flex items-center gap-1.5`}>
              <span>🔥</span>
              <span>Streak</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Current</div>
                <div className={`text-xl font-bold ${lightMode ? 'text-gray-900' : 'text-gray-200'}`}>
                  {streaks.main.current} {streaks.main.current === 1 ? 'day' : 'days'}
                </div>
              </div>
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Longest</div>
                <div className={`text-xl font-bold ${lightMode ? 'text-gray-900' : 'text-gray-200'}`}>
                  {streaks.main.longest} {streaks.main.longest === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
            {streaks.main.current === 0 && (
              <div className={`text-xs mt-2 ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Solve today's main puzzle to start!
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left half: Stars histogram */}
            <div className={`rounded border p-3 ${lightMode ? 'border-gray-300 bg-gray-50' : 'border-gray-800 bg-gray-900/40'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-2`}>Stars</div>
              <StarsHistogram counts={mainH} lightMode={lightMode} />
            </div>
            
            {/* Right half: Solved and Avg time */}
            <div className={`rounded border p-3 ${lightMode ? 'border-gray-300 bg-gray-50' : 'border-gray-800 bg-gray-900/40'} flex flex-col gap-3`}>
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Solved</div>
                <div className="text-lg font-semibold">{pct(mainCompleted.size, mainTotal)}%</div>
                <div className={`text-xs ${lightMode ? 'text-gray-500' : 'text-gray-500'}`}>{mainCompleted.size}/{mainTotal} puzzles</div>
              </div>
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Avg time</div>
                <div className="text-lg font-semibold">{formatAvg(mainAvg)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Section */}
        <div className={`rounded-lg border p-4 ${lightMode ? 'border-orange-300 bg-orange-50' : 'border-orange-800 bg-orange-900/40'}`}>
          <div className="text-lg font-semibold mb-3">
            Quick Puzzle
          </div>
          
          {/* Streak */}
          <div className={`rounded border p-3 mb-3 ${lightMode ? 'border-gray-300 bg-gray-50' : 'border-gray-800 bg-gray-900/40'}`}>
            <div className={`${lightMode ? 'text-gray-700' : 'text-gray-300'} text-sm mb-2 font-semibold flex items-center gap-1.5`}>
              <span>🔥</span>
              <span>Streak</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Current</div>
                <div className={`text-xl font-bold ${lightMode ? 'text-gray-900' : 'text-gray-200'}`}>
                  {streaks.quick.current} {streaks.quick.current === 1 ? 'day' : 'days'}
                </div>
              </div>
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Longest</div>
                <div className={`text-xl font-bold ${lightMode ? 'text-gray-900' : 'text-gray-200'}`}>
                  {streaks.quick.longest} {streaks.quick.longest === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
            {streaks.quick.current === 0 && (
              <div className={`text-xs mt-2 ${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Solve today's quick puzzle to start!
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left half: Stars histogram */}
            <div className={`rounded border p-3 ${lightMode ? 'border-gray-300 bg-gray-50' : 'border-gray-800 bg-gray-900/40'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-2`}>Stars</div>
              <StarsHistogram counts={quickH} lightMode={lightMode} />
            </div>
            
            {/* Right half: Solved and Avg time */}
            <div className={`rounded border p-3 ${lightMode ? 'border-gray-300 bg-gray-50' : 'border-gray-800 bg-gray-900/40'} flex flex-col gap-3`}>
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Solved</div>
                <div className="text-lg font-semibold">{pct(quickCompleted.size, quickTotal)}%</div>
                <div className={`text-xs ${lightMode ? 'text-gray-500' : 'text-gray-500'}`}>{quickCompleted.size}/{quickTotal} puzzles</div>
              </div>
              <div>
                <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'} text-xs mb-1`}>Avg time</div>
                <div className="text-lg font-semibold">{formatAvg(quickAvg)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className={`rounded-lg border p-4 ${lightMode ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-800/50'}`}>
          <div className={`text-lg font-semibold mb-3 ${lightMode ? 'text-slate-800' : 'text-slate-200'}`}>Badges</div>
          <BadgesDisplay lightMode={lightMode} />
        </div>
      </div>
    </div>
  );
}


