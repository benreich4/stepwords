const celebrationMp3 = import.meta.glob("../../sounds/celebration/*.mp3", {
  eager: true,
  import: "default",
  query: "?url",
});
const celebrationWav = import.meta.glob("../../sounds/celebration/*.wav", {
  eager: true,
  import: "default",
  query: "?url",
});

const CELEBRATION_SOUND_URLS = [...Object.values(celebrationMp3), ...Object.values(celebrationWav)];

const COMPLETION_SOUND_PLAYED_KEY = "stepwords-completion-sound-played";

function pickRandomCelebrationUrl() {
  if (CELEBRATION_SOUND_URLS.length === 0) return null;
  return CELEBRATION_SOUND_URLS[Math.floor(Math.random() * CELEBRATION_SOUND_URLS.length)];
}

/** Play a random celebration sound from the rotation pool. */
export function playCelebrationSound() {
  const url = pickRandomCelebrationUrl();
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch {}
}

/** Play completion sound only the first time for this puzzle. Call when completion modal would show. */
export function playCompletionSoundOnce(puzzleId, puzzleNamespace, _isPerfect, soundsEnabled = true) {
  if (!soundsEnabled) return;
  try {
    const key = `${puzzleNamespace}:${puzzleId}`;
    const played = new Set(JSON.parse(localStorage.getItem(COMPLETION_SOUND_PLAYED_KEY) || "[]"));
    if (played.has(key)) return;
    played.add(key);
    localStorage.setItem(COMPLETION_SOUND_PLAYED_KEY, JSON.stringify(Array.from(played)));
    playCelebrationSound();
  } catch {}
}
