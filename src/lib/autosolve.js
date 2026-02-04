import { useEffect, useRef } from 'react';

/**
 * Custom hook for autosolve mode functionality
 */
export function useAutosolve({
  autosolveMode,
  rows,
  setLevel,
  setCursor,
  setGuessAt,
  setGuesses,
  submitRow,
  setShowAutosolveIntro,
  setShowAutosolveIntroMoved,
  setShowAutosolveFinal,
  setShowAutosolveFinalMoved,
  gridScrollRef,
  setLastRowPosition,
  setIntroPopupPosition,
  setFinalPopupPosition,
}) {
  const autosolveDoneRef = useRef(false);
  const autosolveGuessRef = useRef({});

  // Main autosolve effect
  useEffect(() => {
    if (!autosolveMode || autosolveDoneRef.current) return;
    if (!rows || !rows.length) return;
    
    autosolveDoneRef.current = true;
    
    // Show intro popup for 2 seconds, then move it to bottom
    setShowAutosolveIntro(true);
    
    setTimeout(() => {
      // Measure position right before moving and store it
      const measureBeforeMove = () => {
        if (gridScrollRef.current && rows.length > 0) {
          const lastSolvedIndex = rows.length - 2; // Last solved row (we skip the last one)
          const rowElement = gridScrollRef.current.querySelector(`[data-row-index="${lastSolvedIndex}"]`);
          if (rowElement) {
            const rect = rowElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(rowElement);
            const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
            const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
            // Calculate position relative to viewport (not document) for transform-based positioning
            // rect.bottom is already relative to viewport, so we just add spacing
            const viewportBottom = rect.bottom + marginBottom + paddingBottom + 50;
            setLastRowPosition(viewportBottom);
            setIntroPopupPosition(viewportBottom); // Store stable position for transition
          }
        }
      };
      
      // Measure multiple times to ensure accurate position
      measureBeforeMove();
      setTimeout(measureBeforeMove, 50);
      setTimeout(measureBeforeMove, 100);
      // Define solveNextRow function first
      const solveNextRow = (rowIndex) => {
        // Skip the last row - show final popup instead
        if (rowIndex >= rows.length - 1) {
          // Hide the intro popup when final popup appears
          setShowAutosolveIntro(false);
          setShowAutosolveFinal(true);
          
          // Measure final popup position before moving
          const measureFinalPosition = () => {
            if (gridScrollRef.current && rows.length > 0) {
              const lastRowElement = gridScrollRef.current.querySelector(`[data-row-index="${rows.length - 1}"]`);
              if (lastRowElement) {
                const rect = lastRowElement.getBoundingClientRect();
                // Calculate position relative to viewport (not document) for transform-based positioning
                // rect.bottom is already relative to viewport, so we just add spacing
                const viewportBottom = rect.bottom + 20;
                setFinalPopupPosition(viewportBottom);
              }
            }
          };
          
          // Measure and store position, then move after a brief moment
          setTimeout(() => {
            measureFinalPosition();
            setTimeout(measureFinalPosition, 50);
            setTimeout(() => {
              setShowAutosolveFinalMoved(true);
            }, 100);
          }, 500);
          return;
        }
        
        const answer = rows[rowIndex].answer.toUpperCase();
        const letters = answer.split('');
        
        setLevel(rowIndex);
        setCursor(0);
        
        autosolveGuessRef.current[rowIndex] = "";
        setGuessAt(rowIndex, "");
        
        setTimeout(() => {
          letters.forEach((letter, letterIndex) => {
            setTimeout(() => {
              autosolveGuessRef.current[rowIndex] = (autosolveGuessRef.current[rowIndex] || "") + letter;
              const currentGuess = autosolveGuessRef.current[rowIndex];
              
              setGuessAt(rowIndex, currentGuess);
              setCursor(letterIndex + 1);
              
              if (letterIndex === letters.length - 1) {
                setTimeout(() => {
                  autosolveGuessRef.current[rowIndex] = answer;
                  setGuessAt(rowIndex, answer);
                  setLevel(rowIndex);
                  
                  setTimeout(() => {
                    setGuesses(prev => {
                      const updated = [...prev];
                      updated[rowIndex] = answer;
                      return updated;
                    });
                    
                    setTimeout(() => {
                      submitRow(rowIndex, answer);
                      
                      // Wait after submitting to capture the color animation
                      // The stagger animation takes ~28ms * number of letters, so wait for that plus buffer
                      const animationDuration = answer.length * 28 + 500; // Extra buffer for smooth capture
                      setTimeout(() => {
                        solveNextRow(rowIndex + 1);
                      }, Math.max(animationDuration, 1500)); // At least 1.5 seconds between rows
                    }, 200); // Small delay before submit
                  }, 200);
                }, 200); // Wait after typing last letter
              }
            }, letterIndex * 250); // Typing: 250ms per letter
          });
        }, 400); // Wait before starting to type
      };
      
      // Now trigger the popup movement and wait for transition to complete
      setTimeout(() => {
        // Ensure position is set before starting transition
        measureBeforeMove();
        setTimeout(() => {
          setShowAutosolveIntroMoved(true);
          
          // Wait for the popup transition to complete (1500ms) before starting to solve
          // The transition duration is defined in AutosolveIntroPopup.jsx as duration-[1500ms]
          setTimeout(() => {
            // Now start solving after transition is complete
            solveNextRow(0);
          }, 1500);
        }, 50);
      }, 150);
    }, 2000);
  }, [
    autosolveMode,
    rows,
    setLevel,
    setCursor,
    setGuessAt,
    setGuesses,
    submitRow,
    setShowAutosolveIntro,
    setShowAutosolveIntroMoved,
    setShowAutosolveFinal,
    setShowAutosolveFinalMoved,
    gridScrollRef,
    setLastRowPosition,
    setIntroPopupPosition,
    setFinalPopupPosition
  ]);

  return {
    autosolveGuessRef
  };
}
