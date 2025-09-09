export const TOKEN_TO_EMOJI = { G: "🟩", Y: "🟨" };

export function letterCounts(s) {
  const m = new Map();
  for (const ch of s) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}

export function computeStepIndices(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) { out.push(-1); continue; }
    const prev = rows[i-1].answer.toUpperCase();
    const cur  = rows[i].answer.toUpperCase();
    const pc = letterCounts(prev), cc = letterCounts(cur);
    let stepLetter = null;
    for (const [ch, cnt] of cc.entries()) {
      const diff = cnt - (pc.get(ch) || 0);
      if (diff > 0) { stepLetter = ch; break; }
    }
    out.push(stepLetter ? cur.lastIndexOf(stepLetter) : -1);
  }
  return out;
}

export function isPuzzleSolved(colors, rows) {
  return rows.every((r, i) => (colors[i] || []).every(Boolean));
}

export function buildEmojiShareGridFrom(rows, colorsSnapshot) {
  return rows.map((r, i) => {
    const len = r.answer.length;
    return Array.from({ length: len }, (_, c) => {
      const tok = colorsSnapshot[i]?.[c];
      if (tok === "G") return TOKEN_TO_EMOJI.G;
      if (tok === "Y") return TOKEN_TO_EMOJI.Y;
      return "⬜";
    }).join("");
  }).join("\n");
}
