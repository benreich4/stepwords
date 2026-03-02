export async function fetchPacks() {
  const res = await fetch("/packs.json");
  if (!res.ok) throw new Error("Failed to load puzzle packs");
  return res.json();
}

export async function getPackById(packId) {
  const packs = await fetchPacks();
  const pack = packs.find((p) => String(p.id) === String(packId));
  if (!pack) throw new Error(`Puzzle pack "${packId}" not found`);
  return pack;
}
