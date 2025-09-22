import { useEffect, useState } from "react";
import { fetchQuickManifest } from "../lib/quickPuzzles.js";
import { getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";
import { useNavigate } from "react-router-dom";

export default function QuickToday() {
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    fetchQuickManifest()
      .then((manifest) => {
        if (!mounted) return;
        const today = getTodayIsoInET();
        const preview = isPreviewEnabled();
        const available = manifest.filter(p => preview || p.date <= today);
        const latest = available.sort((a,b)=>a.date.localeCompare(b.date)).slice(-1)[0];
        if (latest?.id) {
          navigate(`/quick/${latest.id}`, { replace: true });
        } else {
          setErr("No Quick Stepword available yet.");
        }
      })
      .catch((e)=>setErr(e.message));
    return () => { mounted = false; };
  }, [navigate]);
  return <div className="px-3 py-4 text-gray-400">{err || "Loading…"}</div>;
}


