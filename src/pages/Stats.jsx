import { useEffect, useMemo, useState } from "react";
import { fetchManifest } from "../lib/puzzles.js";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET } from "../lib/date.js";

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
  const bar = (n, color) => (
    <div className="flex items-center gap-2">
      <div className="w-12 text-right text-xs">{n}★</div>
      <div className={`h-3 rounded ${lightMode ? 'bg-gray-200' : 'bg-gray-800'} flex-1 overflow-hidden`}>
        <div className={`h-full ${color}`} style={{ width: `${pct(counts[n]||0)}%` }} />
      </div>
      <div className="w-10 text-xs text-right">{pct(counts[n]||0)}%</div>
    </div>
  );
  return (
    <div className="space-y-1">
      {bar(3, 'bg-yellow-400')}
      {bar(2, 'bg-yellow-300')}
      {bar(1, 'bg-yellow-200')}
      {bar(0, 'bg-gray-400')}
    </div>
  );
}

export default function Stats() {
  const [mainTotal, setMainTotal] = useState(0);
  const [quickTotal, setQuickTotal] = useState(0);
  const [lightMode, setLightMode] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('stepwords-settings')||'{}'); return s.lightMode===true; } catch { return false; }
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
    document.addEventListener('stepwords-settings-updated', onSettings);
    return () => document.removeEventListener('stepwords-settings-updated', onSettings);
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
    <div className={`px-4 py-6 flex justify-center ${lightMode ? 'text-gray-900' : 'text-gray-200'}`}>
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Stats */}
        <div className={`rounded-xl border p-4 ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-800 bg-gray-900/40'}`}>
          <div className="text-lg font-semibold mb-3">Main Stats</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300' : 'border-gray-800'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Solved</div>
              <div className="text-xl font-semibold">{pct(mainCompleted.size, mainTotal)}% <span className="text-xs">({mainCompleted.size}/{mainTotal})</span></div>
            </div>
            <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300' : 'border-gray-800'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Avg time</div>
              <div className="text-xl font-semibold">{formatAvg(mainAvg)}</div>
            </div>
          </div>
          <div className={`${lightMode ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Stars histogram</div>
          <StarsHistogram counts={mainH} lightMode={lightMode} />
        </div>

        {/* Quick Stats */}
        <div className={`rounded-xl border p-4 ${lightMode ? 'border-gray-300 bg-white' : 'border-gray-800 bg-gray-900/40'}`}>
          <div className="text-lg font-semibold mb-3">Quick Stats</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300' : 'border-gray-800'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Solved</div>
              <div className="text-xl font-semibold">{pct(quickCompleted.size, quickTotal)}% <span className="text-xs">({quickCompleted.size}/{quickTotal})</span></div>
            </div>
            <div className={`rounded-lg border p-3 ${lightMode ? 'border-gray-300' : 'border-gray-800'}`}>
              <div className={`${lightMode ? 'text-gray-600' : 'text-gray-400'}`}>Avg time</div>
              <div className="text-xl font-semibold">{formatAvg(quickAvg)}</div>
            </div>
          </div>
          <div className={`${lightMode ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Stars histogram</div>
          <StarsHistogram counts={quickH} lightMode={lightMode} />
        </div>
      </div>
    </div>
  );
}


