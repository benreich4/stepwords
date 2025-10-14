import { useEffect, useState } from "react";
import { isPreviewEnabled } from "../lib/date.js";
import { Link } from "react-router-dom";

export default function Submissions() {
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [copyingId, setCopyingId] = useState(null);

  useEffect(() => {
    document.title = "Stepwords - Submissions";
    if (!isPreviewEnabled()) {
      setErr("Submissions are only available with preview=on.");
      return;
    }
    fetch("/api/list-submissions.php")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch((e) => {
        // Fallback to localStorage for local development
        console.log('API not available, falling back to localStorage:', e.message);
        try {
          const submissions = JSON.parse(localStorage.getItem('puzzleSubmissions') || '[]');
          const items = submissions.map((sub, index) => ({
            id: `local-${index}`,
            author: sub.author || 'Local User',
            submittedAt: sub.submittedAt || new Date().toISOString(),
            filename: `local-submission-${index}.json`
          }));
          setItems(items);
        } catch (localError) {
          setErr('No submissions found (API unavailable and no local data)');
        }
      });
  }, []);

  const copyJson = async (id) => {
    setCopyingId(id);
    try {
      let json;
      if (id.startsWith('local-')) {
        // Handle local submissions
        const submissions = JSON.parse(localStorage.getItem('puzzleSubmissions') || '[]');
        const index = parseInt(id.replace('local-', ''));
        json = submissions[index];
        if (!json) throw new Error('Local submission not found');
      } else {
        // Handle API submissions
        const response = await fetch(`/api/get-submission.php?id=${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        json = await response.json();
      }
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      // Reset copying state after a brief delay
      setTimeout(() => setCopyingId(null), 1000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
      setCopyingId(null);
    }
  };

  if (err) {
    return (
      <div className="px-4 py-6 text-gray-200">
        <div className="max-w-xl mx-auto">
          <div className="mb-2 text-lg font-semibold">Submissions</div>
          <div className="text-red-400">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 text-gray-200">
      <div className="max-w-xl mx-auto">
        <div className="mb-3 text-lg font-semibold">Submissions</div>
        {!items.length && (
          <div className="text-gray-400">No submissions found.</div>
        )}
        <ul className="divide-y divide-gray-800 border border-gray-800 rounded">
          {items.map((it) => (
            <li key={it.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">{it.author || "(Unknown author)"}</div>
                <div className="text-[11px] text-gray-400">{it.submittedAt || it.filename}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyJson(it.id)}
                  disabled={copyingId === it.id}
                  className="text-purple-400 text-sm hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {copyingId === it.id ? 'Copied!' : 'Copy JSON'}
                </button>
                <Link className="text-sky-400 text-sm hover:underline" to={`/submissions/${encodeURIComponent(it.id)}`}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


