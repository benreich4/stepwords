export async function fetchOtherManifest() {
  const res = await fetch("/other/index.json");
  if (!res.ok) throw new Error("Failed to load other puzzle manifest");
  return res.json();
}

export async function loadOtherById(id) {
  const [manifest, puzzle] = await Promise.all([
    fetchOtherManifest(),
    fetch(`/other/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`Other puzzle ${id} not found`);
      return r.json();
    }),
  ]);

  const meta = manifest.find((p) => String(p.id) === String(id));
  return {
    id,
    rows: puzzle.rows || [],
    author: meta?.author || puzzle.author || "Unknown",
    date: meta?.date || puzzle.date || "",
  };
}


