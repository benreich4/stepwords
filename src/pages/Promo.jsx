import { useEffect, useMemo, useRef, useState } from "react";
import { computeStepIndices } from "../lib/gameUtils.js";
import { getTodayIsoInET } from "../lib/date.js";

function SingleArcDemo() {
  // Demo: SOW -> OWES -> SWORE -> POWERS -> POWDERS -> STEPWORD
  const TILE = 64;
  const GAP = 10;
  const BASE_Y = 16;
  const ARC_H = 72;
  const DURATION = 1750; // was 1400
  const FADE_DELAY = 190; // was 150
  const FADE_MS = 1250; // was 1000
  const [phase, setPhase] = useState(0); // 0 SOW, 1 OWES, 2 SWORE, 3 POWERS, 4 POWDERS, 5 STEPWORD
  const clues = [
    "Scatter, as seeds",
    "Is in debt",
    "Promised",
    "The ___ that be",
    "Some makeup options",
    "The type of puzzle you are solving!",
  ];
  const [pos, setPos] = useState(() => ({
    S: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 1 },
    O: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 1 },
    W: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 1 },
    E: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
  }));
  const rafRef = useRef(0);
  const animatingRef = useRef(false);
  const startRef = useRef(0);

  // Targets for OWES: O→0, W→1, E→2 (fade-in), S→3
  const targets = { S: 3, O: 0, W: 1 };
  const starts = { S: 0, O: 1, W: 2 };

  // Final Step 5: POWDERS -> STEPWORD
  const runStep5 = () => {
    setPhase(5); // show STEPWORD clue before transition
    startRef.current = 0;
    const step5 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => -ARC_H * 4 * t * (1 - t);
      // From POWDERS: P0 O1 W2 D3 E4 R5 S6
      setPos((prev) => ({
        P: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 1 },
        O: { x: lerp(1 * (TILE + GAP), 5 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        W: { x: lerp(2 * (TILE + GAP), 4 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        D: { x: lerp(3 * (TILE + GAP), 7 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        E: { x: lerp(4 * (TILE + GAP), 2 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        R: { x: lerp(5 * (TILE + GAP), 6 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        S: { x: lerp(6 * (TILE + GAP), 0 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: prev.T.opacity },
      }));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step5);
      } else {
        // Settle to STEPWORD and fade in T at index 1
        setPos((prev) => ({
          ...prev,
          S: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
          E: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          P: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          W: { x: 4 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          O: { x: 5 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          R: { x: 6 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          D: { x: 7 * (TILE + GAP), y: BASE_Y, opacity: 1 },
        }));
        let fadeStart = 0;
        const fadeT = (t5) => {
          if (!fadeStart) fadeStart = t5;
          let q = (t5 - fadeStart) / FADE_MS;
          if (q < 0) q = 0;
          if (q > 1) q = 1;
          setPos((prev) => ({ ...prev, T: { ...prev.T, opacity: q } }));
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeT);
          } else {
            animatingRef.current = false;
          }
        };
        setTimeout(() => { rafRef.current = requestAnimationFrame(fadeT); }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step5);
  };

  // Step 4: POWERS -> POWDERS (add D at index 3; E:3->4, R:4->5, S:5->6; P/O/W stay)
  const runStep4 = () => {
    setPhase(4);
    startRef.current = 0;
    const step4 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => -ARC_H * 4 * t * (1 - t);
      setPos((prev) => ({
        P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: prev.P.opacity },
        O: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: prev.O.opacity },
        W: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: prev.W.opacity },
        E: { x: lerp(3 * (TILE + GAP), 4 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: prev.E.opacity },
        R: { x: lerp(4 * (TILE + GAP), 5 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: prev.R.opacity },
        S: { x: lerp(5 * (TILE + GAP), 6 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: prev.S.opacity },
        D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: prev.D.opacity },
        T: prev.T,
      }));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step4);
      } else {
        setPos((prev) => ({
          ...prev,
          P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          O: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          W: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
          E: { x: 4 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          R: { x: 5 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          S: { x: 6 * (TILE + GAP), y: BASE_Y, opacity: 1 },
        }));
        let fadeStart = 0;
        const fadeD = (t4) => {
          if (!fadeStart) fadeStart = t4;
          let q = (t4 - fadeStart) / FADE_MS;
          if (q < 0) q = 0;
          if (q > 1) q = 1;
          setPos((prev) => ({ ...prev, D: { ...prev.D, opacity: q } }));
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeD);
          } else {
            setTimeout(() => runStep5(), 500);
          }
        };
        setTimeout(() => { rafRef.current = requestAnimationFrame(fadeD); }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step4);
  };

  // Step 3: SWORE -> POWERS (P fades in at 0)
  const runStep3 = () => {
    setPhase(3);
    startRef.current = 0;
    const step3 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => -ARC_H * 4 * t * (1 - t);
      setPos((prev) => ({
        S: { x: lerp(0 * (TILE + GAP), 5 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        O: { x: lerp(2 * (TILE + GAP), 1 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        W: { x: lerp(1 * (TILE + GAP), 2 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        E: { x: lerp(4 * (TILE + GAP), 3 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        R: { x: lerp(3 * (TILE + GAP), 4 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
        D: prev.D,
        T: prev.T,
      }));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step3);
      } else {
        setPos((prev) => ({
          ...prev,
          S: { x: 5 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          O: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          W: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          E: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          R: { x: 4 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
        }));
        let fadeStart = 0;
        const fadeP = (t3) => {
          if (!fadeStart) fadeStart = t3;
          let q = (t3 - fadeStart) / FADE_MS;
          if (q < 0) q = 0;
          if (q > 1) q = 1;
          setPos((prev) => ({ ...prev, P: { ...prev.P, opacity: q } }));
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeP);
          } else {
            setTimeout(() => runStep4(), 312);
          }
        };
        setTimeout(() => { rafRef.current = requestAnimationFrame(fadeP); }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step3);
  };

  // Step 2: OWES -> SWORE (S:3->0, O:0->2, W:1 stays, E:2->4; R fades in at 3)
  const runStep2 = () => {
    setPhase(2);
    startRef.current = 0;
    const step2 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => -ARC_H * 4 * t * (1 - t);
      setPos((prev) => ({
        S: { x: lerp(3 * (TILE + GAP), 0 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        O: { x: lerp(0 * (TILE + GAP), 2 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
        W: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 1 },
        E: { x: lerp(2 * (TILE + GAP), 4 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: prev.E.opacity },
        R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
        P: prev.P,
        D: prev.D,
        T: prev.T,
      }));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step2);
      } else {
        setPos((prev) => ({
          ...prev,
          S: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          O: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          W: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          E: { x: 4 * (TILE + GAP), y: BASE_Y, opacity: 1 },
          R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
        }));
        let fadeStart = 0;
        const fadeR = (t2) => {
          if (!fadeStart) fadeStart = t2;
          let q = (t2 - fadeStart) / FADE_MS;
          if (q < 0) q = 0;
          if (q > 1) q = 1;
          setPos((prev) => ({ ...prev, R: { ...prev.R, opacity: q } }));
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeR);
          } else {
            setTimeout(() => runStep3(), 312);
          }
        };
        setTimeout(() => { rafRef.current = requestAnimationFrame(fadeR); }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step2);
  };

  const run = () => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    // reset to SOW with E hidden
    setPhase(0);
    setPos({
      S: { x: starts.S * (TILE + GAP), y: BASE_Y, opacity: 1 },
      O: { x: starts.O * (TILE + GAP), y: BASE_Y, opacity: 1 },
      W: { x: starts.W * (TILE + GAP), y: BASE_Y, opacity: 1 },
      E: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    });
    startRef.current = 0;
    const step = (ts) => {
      if (!startRef.current) { setPhase(1); startRef.current = ts; }
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => -ARC_H * 4 * t * (1 - t);
      setPos((prev) => {
        const next = {};
        for (const k of ["S", "O", "W"]) {
          const sx = starts[k] * (TILE + GAP);
          const ex = targets[k] * (TILE + GAP);
          next[k] = { x: lerp(sx, ex, p), y: BASE_Y + raise(p), opacity: 1 };
        }
        next.E = prev.E;
        next.R = prev.R;
        next.P = prev.P;
        next.D = prev.D;
        next.T = prev.T;
        return { ...prev, ...next };
      });
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setPos({
          S: { x: targets.S * (TILE + GAP), y: BASE_Y, opacity: 1 },
          O: { x: targets.O * (TILE + GAP), y: BASE_Y, opacity: 1 },
          W: { x: targets.W * (TILE + GAP), y: BASE_Y, opacity: 1 },
          E: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 0 },
          R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
          P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
          D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
          T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
        });
        setTimeout(() => {
          let fadeStart = 0;
          const fadeStep = (ts) => {
            if (!fadeStart) fadeStart = ts;
            let q = (ts - fadeStart) / FADE_MS;
            if (q < 0) q = 0;
            if (q > 1) q = 1;
            setPos((prev) => ({ ...prev, E: { ...prev.E, opacity: q } }));
            if (q < 1) {
              rafRef.current = requestAnimationFrame(fadeStep);
            } else {
              setTimeout(() => runStep2(), 312);
            }
          };
          rafRef.current = requestAnimationFrame(fadeStep);
        }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    let mounted = true;
    const startId = setTimeout(() => { if (mounted) run(); }, 900); // increased initial delay
    return () => { mounted = false; clearTimeout(startId); cancelAnimationFrame(rafRef.current); };
  }, []);

  const widthPx = 8 * TILE + 7 * GAP; // slots 0..7 (STEPWORD)

  const Tile = ({ label }) => (
    <div
      className="absolute inline-flex items-center justify-center border rounded-[10px].uppercase font-black leading-none bg-green-600 border-green-500 text-white shadow-lg"
      style={{
        width: `${TILE}px`,
        height: `${TILE}px`,
        transform: `translate(${pos[label].x}px, ${pos[label].y}px)`,
        transition: 'opacity 1250ms ease',
        opacity: pos[label].opacity,
      }}
    >
      {label}
    </div>
  );

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="text-2xl font-extrabold">Introducing Stepword Puzzles!</div>
        <a
          href="https://stepwords.xyz"
          className="text-sky-400 hover:underline text-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://stepwords.xyz
        </a>
        <div
          className="w-full"
          style={{ maxWidth: `${widthPx}px` }}
        >
          <div className="mx-auto w-full rounded-md border border-gray-700 bg-gray-900/70 px-2 py-1 text-sm text-gray-200 text-center shadow mb-1">
            {clues[phase]}
          </div>
        </div>
        <div className="relative" style={{ width: `${widthPx}px`, height: `${TILE + ARC_H + BASE_Y}px`, willChange: 'transform' }}>
          {/* baseline guide removed */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-md"
              style={{
                width: `${TILE}px`,
                height: `${TILE}px`,
                left: `${i * (TILE + GAP)}px`,
                top: `${BASE_Y}px`,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
              }}
            />
          ))}
          <Tile label="S" />
          <Tile label="T" />
          <Tile label="E" />
          <Tile label="P" />
          <Tile label="W" />
          <Tile label="O" />
          <Tile label="R" />
          <Tile label="D" />
        </div>
        <button
          onClick={run}
          className="px-3 py-1.5 rounded border border-gray-600 bg-gray-800 hover:bg-gray-700 text-sm"
        >
          Replay transition
        </button>
      </div>
    </div>
  );
}

export default function Promo() {
  return <SingleArcDemo />;
}


