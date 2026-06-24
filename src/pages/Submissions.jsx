import { useEffect, useState } from "react";
import { isPreviewEnabled } from "../lib/date.js";
import { useLightMode, utilityPageClass, utilityCardClass, utilityMutedClass } from "../hooks/useLightMode.js";
import { Link } from "react-router-dom";

export default function Submissions() {
  const light = useLightMode();
  const page = utilityPageClass(light);
  const card = utilityCardClass(light);
  const muted = utilityMutedClass(light);
  const pill = light
    ? "rounded-xl border border-parchment-300 bg-parchment-50 text-navyink-700 hover:bg-parchment-100"
    : "rounded-xl border border-navyink-600 bg-navyink-800 text-parchment-200 hover:bg-navyink-700";
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [copyingId, setCopyingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLastWords, setShowLastWords] = useState(false);

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
          const items = submissions.map((sub, index) => {
            let lastWord = null;
            if (sub.rows && Array.isArray(sub.rows) && sub.rows.length > 0) {
              const lastRow = sub.rows[sub.rows.length - 1];
              lastWord = lastRow.answer || null;
            }
            return {
              id: `local-${index}`,
              author: sub.author || 'Local User',
              email: sub.email || null,
              submittedAt: sub.submittedAt || new Date().toISOString(),
              filename: `local-submission-${index}.json`,
              lastWord: lastWord
            };
          });
          setItems(items);
        } catch (localError) {
          setErr('No submissions found (API unavailable and no local data)');
        }
      });
  }, []);

  const copyJson = async (id) => {
    setCopyingId(id);
    try {
      // Construct the submission URL
      const baseUrl = window.location.origin;
      const submissionUrl = `${baseUrl}/submissions/${encodeURIComponent(id)}`;
      
      // Copy the command with the URL, leaving type blank
      const command = `node scripts/copy-submission.mjs ${submissionUrl} `;
      await navigator.clipboard.writeText(command);
      
      // Reset copying state after a brief delay
      setTimeout(() => setCopyingId(null), 1000);
    } catch (error) {
      console.error('Failed to copy command:', error);
      setCopyingId(null);
    }
  };

  const deleteSubmission = async (id) => {
    console.log('Delete submission called with ID:', id);
    try {
      if (id.startsWith('local-')) {
        // Handle local submissions
        console.log('Deleting local submission');
        const submissions = JSON.parse(localStorage.getItem('puzzleSubmissions') || '[]');
        const index = parseInt(id.replace('local-', ''));
        console.log('Local submissions before delete:', submissions.length);
        const updatedSubmissions = submissions.filter((_, i) => i !== index);
        localStorage.setItem('puzzleSubmissions', JSON.stringify(updatedSubmissions));
        console.log('Local submissions after delete:', updatedSubmissions.length);
        
        // Update the items list to reflect the deletion
        setItems(prevItems => prevItems.filter(item => item.id !== id));
        console.log('Updated items list');
      } else {
        // Handle API submissions - try to call delete API
        console.log('Deleting API submission');
        try {
          const response = await fetch(`/api/delete-submission.php?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            console.log('API delete successful');
            setItems(prevItems => prevItems.filter(item => item.id !== id));
          } else {
            console.warn('API delete failed:', response.status);
            // Fallback: just remove from local state
            setItems(prevItems => prevItems.filter(item => item.id !== id));
          }
        } catch (apiError) {
          console.warn('API delete not available, removing from local state only:', apiError);
          // Fallback: just remove from local state
          setItems(prevItems => prevItems.filter(item => item.id !== id));
        }
      }
    } catch (error) {
      console.error('Failed to delete submission:', error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteClick = (id, author) => {
    setDeleteConfirm({ id, author });
  };

  if (err) {
    return (
      <div className={`${page} px-4 py-6`}>
        <div className="max-w-xl mx-auto">
          <div className="mb-2 font-serif text-lg font-semibold">Submissions</div>
          <div className="text-red-500">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${page} px-4 py-6`}>
      <div className="max-w-xl mx-auto">
        <div className="mb-2 font-serif text-lg font-semibold">Submissions</div>
        <div className="mb-3">
          <button onClick={() => setShowLastWords((v) => !v)} className={`px-3 py-1.5 text-xs ${pill}`}>
            {showLastWords ? 'Hide last words' : 'Show last words'}
          </button>
        </div>
        {!items.length && <div className={muted}>No submissions found.</div>}
        <ul className={`divide-y rounded-2xl border ${light ? 'divide-parchment-200 border-parchment-200' : 'divide-navyink-700 border-navyink-700'}`}>
          {items.map((it) => (
            <li key={it.id} className={`p-3 flex items-center justify-between ${light ? 'bg-parchment-50' : 'bg-navyink-800'}`}>
              <div>
                <div className={`text-sm ${light ? 'text-navyink-900' : 'text-parchment-100'}`}>
                  {it.author || "(Unknown author)"}
                  {it.lastWord && <span className={`ml-2 text-xs ${muted}`}>({it.lastWord.replace(/\s+/g, '').length})</span>}
                  {showLastWords && it.lastWord && <span className={`ml-2 text-xs ${muted}`}>• {it.lastWord}</span>}
                </div>
                <div className={`text-[11px] ${muted}`}>
                  {it.email && <span className="mr-2">{it.email}</span>}
                  {it.submittedAt || it.filename}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyJson(it.id)}
                  disabled={copyingId === it.id}
                  className={`text-sm hover:underline disabled:opacity-50 ${light ? 'text-brand-700' : 'text-brand-300'}`}
                >
                  {copyingId === it.id ? 'Copied!' : 'Copy Command'}
                </button>
                <Link className={`text-sm hover:underline ${light ? 'text-brand-700' : 'text-brand-300'}`} to={`/submissions/${encodeURIComponent(it.id)}`}>Open</Link>
                <button onClick={() => handleDeleteClick(it.id, it.author)} className="text-sm text-red-500 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-navyink-900/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`${card} p-6 max-w-md mx-4`}>
            <h3 className={`text-lg font-semibold mb-4 ${light ? 'text-navyink-900' : 'text-parchment-50'}`}>Delete Submission</h3>
            <p className={`${muted} mb-6`}>
              Are you sure you want to delete the submission by <strong>{deleteConfirm.author || "Unknown author"}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className={`px-4 py-2 ${pill}`}>Cancel</button>
              <button onClick={() => deleteSubmission(deleteConfirm.id)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


