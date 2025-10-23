import { useEffect, useState } from "react";
import { isPreviewEnabled } from "../lib/date.js";
import { Link } from "react-router-dom";

export default function Submissions() {
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
        <div className="mb-2 text-lg font-semibold">Submissions</div>
        <div className="mb-3">
          <button
            onClick={() => setShowLastWords((v) => !v)}
            className="px-3 py-1.5 text-xs rounded border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
          >
            {showLastWords ? 'Hide last words' : 'Show last words'}
          </button>
        </div>
        {!items.length && (
          <div className="text-gray-400">No submissions found.</div>
        )}
        <ul className="divide-y divide-gray-800 border border-gray-800 rounded">
          {items.map((it) => (
            <li key={it.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">
                  {it.author || "(Unknown author)"}
                  {showLastWords && it.lastWord && (
                    <span className="ml-2 text-xs text-gray-400">• {it.lastWord}</span>
                  )}
                </div>
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
                <button
                  onClick={() => handleDeleteClick(it.id, it.author)}
                  className="text-red-400 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Delete Submission</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the submission by <strong>{deleteConfirm.author || "Unknown author"}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-300 hover:text-gray-100 border border-gray-600 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSubmission(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


