export async function fetchClueSuggestions(answer) {
  const res = await fetch('/api/suggest-clue.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer: (answer || '').trim() }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch clue suggestions');
  }

  if (!Array.isArray(data.clues) || data.clues.length === 0) {
    throw new Error('No clues returned');
  }

  return data.clues;
}
