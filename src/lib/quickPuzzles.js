// Cache the quick manifest request to avoid re-fetching index.json on every navigation.
let quickManifestPromise = null;

export async function fetchQuickManifest() {
  if (!quickManifestPromise) {
    quickManifestPromise = fetch("/quick/index.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load quick puzzle manifest");
        return res.json();
      })
      .catch((err) => {
        quickManifestPromise = null; // allow retry on failure
        throw err;
      });
  }
  return quickManifestPromise;
}

export async function loadQuickById(id) {
  const [manifest, puzzle] = await Promise.all([
    fetchQuickManifest(),
    fetch(`/quick/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`Quick puzzle ${id} not found`);
      return r.json();
    }),
  ]);

  const meta = manifest.find((p) => String(p.id) === String(id));
  return {
    id,
    rows: puzzle.rows || [],
    author: meta?.author || puzzle.author || "Unknown",
    date: meta?.date || puzzle.date || "",
    emoji: puzzle.emoji || undefined, // Include emoji if present in puzzle JSON
  };
}


