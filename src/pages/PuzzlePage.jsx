import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Game from "../Game.jsx";
import { fetchManifest, loadPuzzleById } from "../lib/puzzles.js";
import { formatDateWithDayOfWeek, getTodayIsoInET, isPreviewEnabled } from "../lib/date.js";

export default function PuzzlePage({ puzzleId: propId, isQuick = false }) {
  const { puzzleId: paramId } = useParams();
  const puzzleId = propId || paramId;
  const [data, setData] = useState(null);
  const [nav, setNav] = useState({ prevId: null, nextId: null });
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setErr("");
    setData(null);

    Promise.all([fetchManifest(), loadPuzzleById(puzzleId)])
      .then(([manifest, json]) => {
        if (!mounted) return;
        const meta = manifest.find((p) => String(p.id) === String(puzzleId));
        const todayET = getTodayIsoInET();
        const preview = isPreviewEnabled();
        if (!meta || (!preview && meta.date > todayET)) {
          throw new Error("This puzzle is not yet available.");
        }
        setData(json);
        // Compute prev/next ids within availability
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
        const pageTitle = `${isQuick ? 'Quick Stepword' : 'Stepword Puzzle'} – #${json.id}${dateStr ? ` (${dateStr})` : ""}`;
        document.title = pageTitle;
        // Update per-page SEO meta
        try {
          const descText = `Daily anagram ladder puzzle for ${dateStr || 'today'}. Build each word by adding a letter.`;
          const setMeta = (sel, attr, value) => {
            let el = document.querySelector(sel);
            if (!el) { el = document.createElement('meta'); el.setAttribute(attr==='property'?'property':'name', sel.includes('property=')?sel.match(/property=\"([^\"]+)\"/)[1]:sel.match(/name=\"([^\"]+)\"/)[1]); document.head.appendChild(el); }
            el.setAttribute(attr, sel.includes('property=')?sel.match(/property=\"([^\"]+)\"/)[1]:sel.match(/name=\"([^\"]+)\"/)[1]);
            el.setAttribute('content', value);
          };
          setMeta('meta[name="description"]','name', 'description');
          document.querySelector('meta[name="description"]').setAttribute('content', descText);
          const ogTitle = document.querySelector('meta[property="og:title"]'); if (ogTitle) ogTitle.setAttribute('content', pageTitle);
          const ogDesc = document.querySelector('meta[property="og:description"]'); if (ogDesc) ogDesc.setAttribute('content', descText);
          const ogUrl = document.querySelector('meta[property="og:url"]'); if (ogUrl) ogUrl.setAttribute('content', `${location.origin}/${isQuick ? 'quick/' : ''}${json.id}`);
          const twTitle = document.querySelector('meta[name="twitter:title"]'); if (twTitle) twTitle.setAttribute('content', pageTitle);
          const twDesc = document.querySelector('meta[name="twitter:description"]'); if (twDesc) twDesc.setAttribute('content', descText);
          // JSON-LD Game schema
          const ld = document.createElement('script');
          ld.type = 'application/ld+json';
          ld.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Game",
            "name": pageTitle,
            "gamePlatform": "Web",
            "inLanguage": "en",
            "datePublished": json.date || todayET,
            "genre": ["Word Game","Puzzle"],
            "publisher": {"@type":"Organization","name":"Stepwords"},
            "url": `${location.origin}/${isQuick ? 'quick/' : ''}${json.id}`
          });
          // remove old injected script if present
          document.querySelectorAll('script[type="application/ld+json"].puzzle-ld').forEach(s=>s.remove());
          ld.className = 'puzzle-ld';
          document.head.appendChild(ld);
        } catch {}
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e.message);
      });

    return () => { mounted = false; };
  }, [puzzleId]);

  if (err) {
    return (
      <div className="px-3 py-4">
        <div className="text-red-400 mb-2">{err}</div>
        <Link to="/" className="text-sky-400 hover:underline">← Back to list</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="px-3 py-4 text-gray-400">Loading…</div>;
  }

  return <Game puzzle={data} prevId={nav.prevId} nextId={nav.nextId} />;
}