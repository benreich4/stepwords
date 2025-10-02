import { useParams } from "react-router-dom";
import Game from "../Game.jsx";
import { useEffect, useState } from "react";
import { fetchQuickManifest, loadQuickById } from "../lib/quickPuzzles.js";
import { formatDateWithDayOfWeek, getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";

export default function QuickPage() {
  const { puzzleId } = useParams();
  const [data, setData] = useState(null);
  const [nav, setNav] = useState({ prevId: null, nextId: null });
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setErr("");
    setData(null);
    Promise.all([fetchQuickManifest(), loadQuickById(puzzleId)])
      .then(([manifest, json]) => {
        if (!mounted) return;
        const meta = manifest.find((p) => String(p.id) === String(puzzleId));
        const todayET = getTodayIsoInET();
        const preview = isPreviewEnabled();
        if (!meta || (!preview && meta.date > todayET)) {
          throw new Error("This Quick Stepword is not yet available.");
        }
        setData(json);
        const idx = manifest.findIndex((p) => String(p.id) === String(puzzleId));
        let prevId = null, nextId = null;
        if (idx > 0) {
          const prev = manifest[idx - 1];
          if (prev && (preview || prev.date <= todayET)) prevId = String(prev.id);
        }
        if (idx >= 0 && idx + 1 < manifest.length) {
          const next = manifest[idx + 1];
          if (next && (preview || next.date <= todayET)) nextId = String(next.id);
        }
        setNav({ prevId, nextId });
        const dateStr = json.date ? formatDateWithDayOfWeek(json.date) : "";
        const pageTitle = `Quick Stepword – #${json.id}${dateStr ? ` (${dateStr})` : ""}`;
        document.title = pageTitle;
      })
      .catch((e) => { if (mounted) setErr(e.message); });
    return () => { mounted = false; };
  }, [puzzleId]);

  if (err) return <div className="px-3 py-4 text-red-400">{err}</div>;
  if (!data) return <div className="px-3 py-4 text-gray-400">Loading…</div>;
  return <Game puzzle={data} isQuick prevId={nav.prevId} nextId={nav.nextId} />;
}


