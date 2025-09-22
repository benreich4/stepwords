import { useParams } from "react-router-dom";
import Game from "../Game.jsx";
import { useEffect, useState } from "react";
import { fetchQuickManifest, loadQuickById } from "../lib/quickPuzzles.js";
import { formatDateWithDayOfWeek, getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";

export default function QuickPage() {
  const { puzzleId } = useParams();
  const [data, setData] = useState(null);
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
        const dateStr = json.date ? formatDateWithDayOfWeek(json.date) : "";
        const pageTitle = `Quick Stepword – #${json.id}${dateStr ? ` (${dateStr})` : ""}`;
        document.title = pageTitle;
      })
      .catch((e) => { if (mounted) setErr(e.message); });
    return () => { mounted = false; };
  }, [puzzleId]);

  if (err) return <div className="px-3 py-4 text-red-400">{err}</div>;
  if (!data) return <div className="px-3 py-4 text-gray-400">Loading…</div>;
  return <Game puzzle={data} isQuick />;
}


