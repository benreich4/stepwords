import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { isPreviewEnabled } from "../lib/date.js";
import Game from "../Game.jsx";

export default function SubmissionPlay() {
  const { sid } = useParams();
  const [err, setErr] = useState("");
  const [puzzle, setPuzzle] = useState(null);

  useEffect(() => {
    if (!isPreviewEnabled()) {
      setErr("Submissions are only available with preview=on.");
      return;
    }
    fetch(`/api/get-submission.php?id=${encodeURIComponent(sid)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (!data || !Array.isArray(data.rows)) throw new Error("Invalid submission format");
        const puzzleData = { id: `submission-${sid}`, author: data.author || "(unknown)", rows: data.rows };
        if (data.emoji) puzzleData.emoji = data.emoji;
        setPuzzle(puzzleData);
      })
      .catch(e => setErr(e.message));
  }, [sid]);

  if (err) return <div className="px-4 py-6 text-red-400">{err}</div>;
  if (!puzzle) return <div className="px-4 py-6 text-gray-400">Loading…</div>;
  return <Game puzzle={puzzle} isQuick={false} />;
}


