const modules = import.meta.glob("../../sounds/progress/*.wav", {
  query: "?url",
  import: "default",
  eager: true,
});

/**
 * Map step index (0-based) in a puzzle with totalSteps rows to a sound index 1..12.
 * The last step always uses 12; earlier steps are spread evenly (e.g. 6 steps → 1, 3, 5, 7, 9, 12).
 */
export function stepIndexToSoundNumber(stepIndex, totalSteps) {
  if (totalSteps <= 0) return 12;
  if (totalSteps === 1) return 12;
  const n = totalSteps;
  const i = Math.max(0, Math.min(stepIndex, n - 1));
  const soundNum = Math.floor(1 + (11 * i) / (n - 1));
  return Math.min(12, Math.max(1, soundNum));
}

function getUrl(soundNum) {
  const n = Math.min(12, Math.max(1, soundNum));
  const name = `final_step_${String(n).padStart(2, "0")}.wav`;
  const entry = Object.entries(modules).find(([path]) => path.endsWith(name));
  const val = entry ? entry[1] : null;
  return val != null ? val : null;
}

/**
 * Play the step sound. Returns a Promise that resolves when the sound ends (or immediately if no sound/error).
 */
export function playStepSound(stepIndex, totalSteps) {
  const soundNum = stepIndexToSoundNumber(stepIndex, totalSteps);
  const url = getUrl(soundNum);
  if (!url) return Promise.resolve();
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    return new Promise((resolve) => {
      a.addEventListener("ended", () => resolve(), { once: true });
      a.addEventListener("error", () => resolve(), { once: true });
      a.play().catch(() => resolve());
    });
  } catch {
    return Promise.resolve();
  }
}

function getIncorrectUrl() {
  const entry = Object.entries(modules).find(([path]) => path.endsWith("incorrect.wav"));
  return entry ? entry[1] : null;
}

export function playIncorrectSound() {
  const url = getIncorrectUrl();
  if (url) {
    try {
      const a = new Audio(url);
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch {}
  }
}

function getIncompleteUrl() {
  const entry = Object.entries(modules).find(([path]) => path.endsWith("incomplete.wav"));
  return entry ? entry[1] : null;
}

export function playIncompleteSound() {
  const url = getIncompleteUrl();
  if (url) {
    try {
      const a = new Audio(url);
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch {}
  }
}
