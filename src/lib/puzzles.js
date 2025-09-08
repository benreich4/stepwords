export async function fetchManifest() {
  const res = await fetch("/puzzles/index.json");
  if (!res.ok) throw new Error("Failed to load puzzle manifest");
  return res.json();
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
  };
}
