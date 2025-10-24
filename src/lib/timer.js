import { useEffect, useRef, useState } from 'react';

export function usePuzzleTimer(initialElapsedMs = 0, initiallyFinished = false) {
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs || 0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(Boolean(initiallyFinished));
  const lastTickRef = useRef(null);

  const start = () => {
    if (finished || running) return;
    lastTickRef.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    if (!running) return;
    const now = Date.now();
    const delta = Math.max(0, now - (lastTickRef.current || now));
    setElapsedMs((ms) => ms + delta);
    lastTickRef.current = null;
    setRunning(false);
  };
  const stop = () => {
    if (finished) return;
    pause();
    setFinished(true);
  };

  // Autostart on mount if not finished
  useEffect(() => {
    if (!finished) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick while running
  useEffect(() => {
    if (!running || finished) return;
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.max(0, now - (lastTickRef.current || now));
      lastTickRef.current = now;
      setElapsedMs((ms) => ms + delta);
    }, 1000);
    return () => clearInterval(id);
  }, [running, finished]);

  // Pause/resume on visibility
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pause(); else if (!finished) start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [finished, running]);

  const format = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  };

  return { elapsedMs, running, finished, start, pause, stop, format };
}

export function shouldHideTimerForLegacy(puzzleNamespace, puzzleId, hadTimerFields) {
  try {
    if (hadTimerFields) return false;
    const idStr = String(puzzleId);
    // Completed list
    try {
      const completed = JSON.parse(localStorage.getItem(`${puzzleNamespace}-completed`) || '[]');
      if (Array.isArray(completed) && completed.map((v)=>String(v)).includes(idStr)) return true;
    } catch {}
    // Any stars record indicates puzzle previously scored (solved or failed)
    try {
      const stars = JSON.parse(localStorage.getItem(`${puzzleNamespace}-stars`) || '{}');
      if (stars && (Object.prototype.hasOwnProperty.call(stars, idStr) || Object.prototype.hasOwnProperty.call(stars, puzzleId))) return true;
    } catch {}
    return false;
  } catch {
    return false;
  }
}


