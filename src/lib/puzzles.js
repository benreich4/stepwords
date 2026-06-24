// Cache the manifest request so navigating between pages doesn't re-fetch index.json repeatedly.
let manifestPromise = null;

export async function fetchManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch("/puzzles/index.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puzzle manifest");
        return res.json();
      })
      .catch((err) => {
        manifestPromise = null; // allow retry on failure
        throw err;
      });
  }
  return manifestPromise;
}

/**
 * Loads a puzzle by ID.
 * - Reads /puzzles/<id>.json
 * - Looks up author/date in /puzzles/index.json
 * - Returns merged object: { id, rows, author, date }
 */
export async function loadPuzzleById(id) {
  const [manifest, puzzle] = await Promise.all([
    fetchManifest(),
    fetch(`/puzzles/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`Puzzle ${id} not found`);
      return r.json();
    }),
  ]);

  const meta = manifest.find((p) => String(p.id) === String(id));
  return {
    id,
    rows: puzzle.rows || [],
    author: meta?.author || "Unknown",
    date: meta?.date || "",
    emoji: puzzle.emoji || undefined, // Include emoji if present in puzzle JSON
  };
}
