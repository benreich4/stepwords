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
    S: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    O: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    W: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    E: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
  }));
  const rafRef = useRef(0);
  const animatingRef = useRef(false);
  const startRef = useRef(0);
  // Track stepladders: oldLetter (fading out, moving) and newLetter (fading in, stationary)
  const [stepLadder, setStepLadder] = useState({ 
    oldLetter: null, 
    oldOpacity: 0,
    newLetter: null, 
    newOpacity: 0 
  });

  // Targets for OWES: O→0, W→1, E→2 (fade-in), S→3
  const targets = { S: 3, O: 0, W: 1 };
  const starts = { S: 0, O: 1, W: 2 };

  // Final Step 5: POWDERS -> STEPWORD
  const runStep5 = () => {
    startRef.current = 0;
    // Start fading in stepladder on T (new letter) and fade out on D (old letter)
    setStepLadder({ oldLetter: 'D', oldOpacity: 1, newLetter: 'T', newOpacity: 0 });
    const step5 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => ARC_H * 4 * t * (1 - t);
      // Fade out stepladder on D (moving) and fade in on T (stationary) during transition
      setStepLadder({ oldLetter: 'D', oldOpacity: 1 - p, newLetter: 'T', newOpacity: p });
      // From POWDERS: P0 O1 W2 D3 E4 R5 S6
      // To STEPWORD: S0 T1 E2 P3 W4 O5 R6 D7
      setPos((prev) => ({
        P: { x: lerp(0 * (TILE + GAP), 3 * (TILE + GAP), p), y: BASE_Y + raise(p), opacity: 1 },
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
        // Clear D's stepladder, keep T's
        setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'T', newOpacity: 1 });
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
          // Stepladder already faded in during transition, keep it visible
          setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'T', newOpacity: 1 });
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeT);
          } else {
            // Keep stepladder visible at the end
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
    startRef.current = 0;
    // Start fading in stepladder on D (new letter) and fade out on P (old letter)
    setStepLadder({ oldLetter: 'P', oldOpacity: 1, newLetter: 'D', newOpacity: 0 });
    const step4 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => ARC_H * 4 * t * (1 - t);
      // Fade out stepladder on P (stationary) and fade in on D (stationary) during transition
      setStepLadder({ oldLetter: 'P', oldOpacity: 1 - p, newLetter: 'D', newOpacity: p });
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
        // Clear P's stepladder, keep D's
        setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'D', newOpacity: 1 });
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
          // Stepladder already faded in during transition, keep it visible
          setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'D', newOpacity: 1 });
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeD);
          } else {
            // Wait 0.25s, switch clue, wait 0.75s, then transition
            setTimeout(() => {
              // Keep D's stepladder visible until step 5 starts
              setPhase(5);
              setTimeout(() => runStep5(), 750);
            }, 250);
          }
        };
        setTimeout(() => { rafRef.current = requestAnimationFrame(fadeD); }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step4);
  };

  // Step 3: SWORE -> POWERS (P fades in at 0)
  const runStep3 = () => {
    startRef.current = 0;
    // Start fading in stepladder on P (new letter) and fade out on R (old letter)
    setStepLadder({ oldLetter: 'R', oldOpacity: 1, newLetter: 'P', newOpacity: 0 });
    const step3 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => ARC_H * 4 * t * (1 - t);
      // Fade out stepladder on R (moving) and fade in on P (stationary) during transition
      setStepLadder({ oldLetter: 'R', oldOpacity: 1 - p, newLetter: 'P', newOpacity: p });
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
        // Clear R's stepladder, keep P's
        setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'P', newOpacity: 1 });
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
          // Stepladder already faded in during transition, keep it visible
          setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'P', newOpacity: 1 });
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeP);
          } else {
            // Wait 0.25s, switch clue, wait 0.75s, then transition
            setTimeout(() => {
              setPhase(4);
              setTimeout(() => runStep4(), 750);
            }, 250);
          }
        };
        setTimeout(() => { rafRef.current = requestAnimationFrame(fadeP); }, FADE_DELAY);
      }
    };
    rafRef.current = requestAnimationFrame(step3);
  };

  // Step 2: OWES -> SWORE (S:3->0, O:0->2, W:1 stays, E:2->4; R fades in at 3)
  const runStep2 = () => {
    startRef.current = 0;
    // Start fading in stepladder on R (new letter) and fade out on E (old letter)
    setStepLadder({ oldLetter: 'E', oldOpacity: 1, newLetter: 'R', newOpacity: 0 });
    const step2 = (ts) => {
      if (!startRef.current) startRef.current = ts;
      let p = (ts - startRef.current) / DURATION;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      const lerp = (a, b, t) => a + (b - a) * t;
      const raise = (t) => ARC_H * 4 * t * (1 - t);
      // Fade out stepladder on E (moving) and fade in on R (stationary) during transition
      setStepLadder({ oldLetter: 'E', oldOpacity: 1 - p, newLetter: 'R', newOpacity: p });
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
        // Clear E's stepladder, keep R's
        setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'R', newOpacity: 1 });
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
          // Stepladder already faded in during transition, keep it visible
          setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'R', newOpacity: 1 });
          if (q < 1) {
            rafRef.current = requestAnimationFrame(fadeR);
          } else {
            // Wait 0.25s, switch clue, wait 0.75s, then transition
            setTimeout(() => {
              setPhase(3);
              setTimeout(() => runStep3(), 750);
            }, 250);
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
    // Start with clue 0, no answer visible
    setPhase(0);
    setPos({
      S: { x: starts.S * (TILE + GAP), y: BASE_Y, opacity: 0 },
      O: { x: starts.O * (TILE + GAP), y: BASE_Y, opacity: 0 },
      W: { x: starts.W * (TILE + GAP), y: BASE_Y, opacity: 0 },
      E: { x: 2 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      R: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      P: { x: 0 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      D: { x: 3 * (TILE + GAP), y: BASE_Y, opacity: 0 },
      T: { x: 1 * (TILE + GAP), y: BASE_Y, opacity: 0 },
    });
    
    // After 0.5 seconds, fade in first answer (SOW)
    setTimeout(() => {
      let fadeStart = null;
      const fadeSOW = (ts) => {
        if (fadeStart === null) {
          fadeStart = ts;
          // Don't update opacity on first frame, wait for next frame
          rafRef.current = requestAnimationFrame(fadeSOW);
          return;
        }
        let q = (ts - fadeStart) / FADE_MS;
        if (q < 0) q = 0;
        if (q > 1) q = 1;
        setPos((prev) => ({
          ...prev,
          S: { ...prev.S, opacity: q },
          O: { ...prev.O, opacity: q },
          W: { ...prev.W, opacity: q },
        }));
        if (q < 1) {
          rafRef.current = requestAnimationFrame(fadeSOW);
        } else {
          // After SOW is visible, wait 0.25s, then switch clue and transition
          setTimeout(() => {
            setPhase(1); // Switch to clue 1
            setTimeout(() => {
              // After 0.75s, transition to OWES
              startRef.current = 0;
              // Start fading in stepladder on E (new letter)
              setStepLadder({ letter: 'E', opacity: 0 });
              const step = (ts) => {
                if (!startRef.current) startRef.current = ts;
                let p = (ts - startRef.current) / DURATION;
                if (p < 0) p = 0;
                if (p > 1) p = 1;
                const lerp = (a, b, t) => a + (b - a) * t;
                const raise = (t) => ARC_H * 4 * t * (1 - t);
                // Fade in stepladder on E (new letter) during transition
                setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'E', newOpacity: p });
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
                      // Stepladder already faded in during transition, keep it visible
                      setStepLadder({ oldLetter: null, oldOpacity: 0, newLetter: 'E', newOpacity: 1 });
                      if (q < 1) {
                        rafRef.current = requestAnimationFrame(fadeStep);
                      } else {
                        // Wait 0.25s, switch clue, wait 0.75s, then transition
                        setTimeout(() => {
                          setPhase(2);
                          setTimeout(() => runStep2(), 750);
                        }, 250);
                      }
                    };
                    rafRef.current = requestAnimationFrame(fadeStep);
                  }, FADE_DELAY);
                }
              };
              rafRef.current = requestAnimationFrame(step);
            }, 750);
          }, 250);
        }
      };
      rafRef.current = requestAnimationFrame(fadeSOW);
    }, 500);
  };

  useEffect(() => {
    let mounted = true;
    const startId = setTimeout(() => { if (mounted) run(); }, 100); // Small delay to ensure component is mounted
    return () => { mounted = false; clearTimeout(startId); cancelAnimationFrame(rafRef.current); };
  }, []);

  const widthPx = 8 * TILE + 7 * GAP; // slots 0..7 (STEPWORD)

  const Tile = ({ label }) => {
    return (
      <div
        className="absolute inline-flex items-center justify-center border rounded-[10px].uppercase font-black leading-none bg-green-600 border-green-500 text-white shadow-lg"
        style={{
          width: `${TILE}px`,
          height: `${TILE}px`,
          transform: `translate(${pos[label].x}px, ${pos[label].y}px)`,
          transition: 'opacity 1250ms ease',
          opacity: pos[label].opacity,
          zIndex: 1, // Ensure tiles are above stepladders when stepladders are behind
        }}
      >
        {label}
      </div>
    );
  };

  // Render stepladder separately so it's visible even when letter opacity is 0
  const renderStepLadder = (letter) => {
    if (!letter || !pos[letter]) return null;
    const isOldLetter = stepLadder.oldLetter === letter;
    const isNewLetter = stepLadder.newLetter === letter;
    if (!isOldLetter && !isNewLetter) return null;
    
    const ladderOpacity = isOldLetter ? stepLadder.oldOpacity : stepLadder.newOpacity;
    if (ladderOpacity <= 0) return null;
    
    // If letter is visible (opacity > 0), stepladder should be on top (z-10)
    // If letter is invisible (opacity = 0), stepladder should be behind (z-0)
    const letterVisible = pos[letter].opacity > 0;
    const zIndex = letterVisible ? 10 : 0;
    
    return (
      <span 
        key={`ladder-${letter}`}
        className="absolute leading-none"
        style={{ 
          left: `${pos[letter].x + TILE - 14}px`, // Position at bottom-right of tile
          top: `${pos[letter].y + TILE - 14}px`,
          opacity: ladderOpacity,
          fontSize: '14px',
          transform: 'translate(-2px, -2px)',
          pointerEvents: 'none',
          zIndex: zIndex
        }}
      >
        🪜
      </span>
    );
  };

  // Calculate square dimensions - make it bigger than content
  const squareSize = widthPx + 70; // Add 70px to create space around content
  const animationHeight = TILE + ARC_H + BASE_Y;
  const clueBoxHeight = 40; // Approximate height of clue box
  const titleHeight = 32; // Approximate height of title
  const urlHeight = 20; // Approximate height of URL
  const explanationHeight = 40; // Approximate height of explanation
  const totalContentHeight = titleHeight + explanationHeight + urlHeight + clueBoxHeight + animationHeight;
  const padding = Math.max(10, (squareSize - totalContentHeight) / 2);
  const topPadding = Math.max(10, padding - 60); // Reduce top padding to move content up

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-black">
      <div 
        id="promo-square"
        className="relative bg-black flex flex-col items-center justify-start"
        style={{ 
          width: `${squareSize}px`, 
          height: `${squareSize}px`,
          paddingTop: `${topPadding}px`,
          paddingBottom: `${padding}px`,
          paddingLeft: '60px',
          paddingRight: '60px',
          border: '2px solid white',
          boxSizing: 'border-box'
        }}
      >
        <div className="text-white mb-2 text-center">
          <div className="text-2xl font-medium mb-1">Love word games?</div>
          <div className="text-5xl font-extrabold">Try Stepwords!</div>
        </div>
        <div className="text-lg text-gray-300 text-center mb-2 px-4">
          Each answer is an anagram of the previous answer plus one additional letter.
        </div>
        <div className="text-base text-gray-400 text-center mb-3">
          Daily puzzles appear at <a href="https://stepwords.xyz" className="text-sky-400 hover:underline" target="_blank" rel="noopener noreferrer">stepwords.xyz</a>
        </div>
        <div
          className="w-full"
          style={{ maxWidth: `${widthPx}px` }}
        >
          <div className="mx-auto w-full rounded-md border border-gray-700 bg-gray-900/70 px-2 py-1 text-lg text-gray-200 text-center shadow mb-1">
            Clue: {clues[phase]}
          </div>
        </div>
        <div className="relative mx-auto" style={{ width: `${widthPx}px`, height: `${TILE + ARC_H + BASE_Y}px`, willChange: 'transform', marginLeft: '40px', marginRight: '40px' }}>
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
          {/* Render stepladders separately so they're visible even when letters have opacity 0 */}
          {stepLadder.oldLetter && renderStepLadder(stepLadder.oldLetter)}
          {stepLadder.newLetter && renderStepLadder(stepLadder.newLetter)}
        </div>
      </div>
    </div>
  );
}

export default function Promo() {
  return <SingleArcDemo />;
}


