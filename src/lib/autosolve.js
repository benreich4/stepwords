import { useEffect, useRef } from 'react';
import { isPartialAutosolveMode } from './autosolveUtils.js';

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
  const isPartialMode = isPartialAutosolveMode();

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
          const lastSolvedIndex = isPartialMode ? rows.length - 1 : rows.length - 2; // Last solved row (we skip the last one in full mode)
          const rowElement = gridScrollRef.current.querySelector(`[data-row-index="${lastSolvedIndex}"]`);
          if (rowElement) {
            const rect = rowElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(rowElement);
            const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
            const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
            // Calculate position relative to viewport (not document) for transform-based positioning
            // rect.bottom is already relative to viewport, so we add spacing
            // Target: top edge of popup should be below the last answer
            const targetTop = rect.bottom + marginBottom + paddingBottom + 50;
            setLastRowPosition(targetTop);
            setIntroPopupPosition(targetTop); // Store target top position
          }
        }
      };
      
      // Don't measure position here - will be measured right before move to prevent stutter
      
      if (isPartialMode) {
        // Partial autosolve mode: fill random letters until 50% are filled
        // Hide cursor by setting it to -1
        setCursor(-1);
        
        const fillPartialLetters = () => {
          // For each row, select 50% of letters to fill
          const rowPositions = rows.map((row, rowIndex) => {
            const answer = row.answer.toUpperCase();
            const letters = answer.split('');
            const positions = letters.map((letter, letterIndex) => ({
              rowIndex,
              letterIndex,
              letter
            }));
            
            // Shuffle positions for this row
            for (let i = positions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            
            // Calculate 50% of this row's letters
            const targetCount = Math.floor(positions.length * 0.5);
            
            // Return the positions to fill for this row
            return positions.slice(0, targetCount);
          });
          
          // Flatten all positions into a single array, maintaining order per row
          const allPositions = rowPositions.flat();
          
          // Shuffle all positions globally so letters fill randomly across all words
          for (let i = allPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
          }
          
          // Track filled positions
          const filledPositions = new Set();
          const currentGuesses = rows.map((row) => {
            // Initialize each row with empty strings for each letter position
            return Array(row.answer.length).fill('');
          });
          
          // Fill letters one at a time
          let filledCount = 0;
          const totalToFill = allPositions.length;
          
          const fillNextLetter = (index) => {
            if (filledCount >= totalToFill) {
              // Done filling - show final popup
              setShowAutosolveIntro(false);
              setShowAutosolveFinal(true);
              
              // Measure final popup position
              const measureFinalPosition = () => {
                if (gridScrollRef.current && rows.length > 0) {
                  const lastRowElement = gridScrollRef.current.querySelector(`[data-row-index="${rows.length - 1}"]`);
                  if (lastRowElement) {
                    const rect = lastRowElement.getBoundingClientRect();
                    const viewportBottom = rect.bottom + 20;
                    setFinalPopupPosition(viewportBottom);
                  }
                }
              };
              
              setTimeout(() => {
                measureFinalPosition();
                setTimeout(measureFinalPosition, 50);
                setTimeout(() => {
                  setShowAutosolveFinalMoved(true);
                }, 100);
              }, 500);
              return;
            }
            
            if (index >= allPositions.length) return;
            
            const { rowIndex, letterIndex, letter } = allPositions[index];
            const key = `${rowIndex}-${letterIndex}`;
            
            // Skip if already filled
            if (filledPositions.has(key)) {
              fillNextLetter(index + 1);
              return;
            }
            
            // Fill this letter at the correct position
            filledPositions.add(key);
            currentGuesses[rowIndex][letterIndex] = letter;
            filledCount++;
            
            // Build the guess string for this row (pad with spaces for unfilled positions)
            const rowLength = rows[rowIndex].answer.length;
            let guessString = '';
            for (let i = 0; i < rowLength; i++) {
              guessString += currentGuesses[rowIndex][i] || ' ';
            }
            
            autosolveGuessRef.current[rowIndex] = guessString;
            setLevel(rowIndex);
            // Set cursor to -1 in partial mode to hide cursor highlighting
            setCursor(-1);
            setGuessAt(rowIndex, guessString);
            
            // Submit the row after writing the letter to show color feedback
            setTimeout(() => {
              submitRow(rowIndex, guessString);
              
              // Continue to next letter after 2 seconds
              setTimeout(() => {
                fillNextLetter(index + 1);
              }, 2000); // 2 seconds between letters
            }, 100); // Small delay before submit
          };
          
          // Start filling letters
          fillNextLetter(0);
        };
        
        // Trigger popup movement and start filling
        setTimeout(() => {
          // Measure position and ensure it's stable before triggering move
          measureBeforeMove();
          setTimeout(() => {
            // Use requestAnimationFrame to ensure position is set before transition starts
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setShowAutosolveIntroMoved(true);
                setTimeout(() => {
                  fillPartialLetters();
                }, 1500);
              });
            });
          }, 100);
        }, 150);
      } else {
        // Full autosolve mode: solve each row completely
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
          // Measure position once right before triggering the move
          measureBeforeMove();
          // Use requestAnimationFrame to ensure position state is updated before transition starts
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setShowAutosolveIntroMoved(true);
              
              // Wait for the popup transition to complete (1500ms) before starting to solve
              // The transition duration is defined in AutosolveIntroPopup.jsx as duration-[1500ms]
              setTimeout(() => {
                // Now start solving after transition is complete
                solveNextRow(0);
              }, 1500);
            });
          });
        }, 150);
      }
    }, 2000);
  }, [
    autosolveMode,
    isPartialMode,
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
