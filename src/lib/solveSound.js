import wowSoundUrl from "../../sounds/dragon-studio-wow-423653.mp3";
import applauseSoundUrl from "../../sounds/freesound_community-applause-75314.mp3";

const COMPLETION_SOUND_PLAYED_KEY = 'stepwords-completion-sound-played';

/** Play the "wow" sound – for perfect solves only (no hints, no wrong guesses). */
export function playSolveSound() {
  try {
    const a = new Audio(wowSoundUrl);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch {}
}

/** Play the applause sound – for non-perfect solves. */
export function playApplauseSound() {
  try {
    const a = new Audio(applauseSoundUrl);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch {}
}

/** Play completion sound only the first time for this puzzle. Call when completion modal would show. */
export function playCompletionSoundOnce(puzzleId, puzzleNamespace, isPerfect, soundsEnabled = true) {
  if (!soundsEnabled) return;
  try {
    const key = `${puzzleNamespace}:${puzzleId}`;
    const played = new Set(JSON.parse(localStorage.getItem(COMPLETION_SOUND_PLAYED_KEY) || '[]'));
    if (played.has(key)) return;
    played.add(key);
    localStorage.setItem(COMPLETION_SOUND_PLAYED_KEY, JSON.stringify(Array.from(played)));
    isPerfect ? playSolveSound() : playApplauseSound();
  } catch {}
}
