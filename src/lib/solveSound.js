import solveSoundUrl from "../../sounds/dragon-studio-wow-423653.mp3";

export function playSolveSound() {
  try {
    const a = new Audio(solveSoundUrl);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch {}
}
