import { useEffect, useState } from "react";
import { isPreviewEnabled } from "../lib/date.js";
import { Link } from "react-router-dom";

export default function Submissions() {
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

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
      .catch((e) => setErr(e.message));
  }, []);

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
              <Link className="text-sky-400 text-sm hover:underline" to={`/submissions/${encodeURIComponent(it.id)}`}>Open</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


