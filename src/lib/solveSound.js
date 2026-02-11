import wowSoundUrl from "../../sounds/dragon-studio-wow-423653.mp3";
import applauseSoundUrl from "../../sounds/freesound_community-applause-75314.mp3";

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
