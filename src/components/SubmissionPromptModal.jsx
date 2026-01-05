import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function SubmissionPromptModal({ onClose, lightMode }) {
  useEffect(() => {
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'submission_prompt_shown', {});
      }
    } catch {}
  }, []);

  const handleCreateClick = () => {
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'submission_prompt_create_clicked', {});
      }
    } catch {}
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { 
          try { localStorage.setItem('stepwords-submission-prompt-shown', '1'); } catch {}; 
          try { if (window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'submission_prompt_dismissed', { action: 'backdrop' }); } } catch {}; 
          onClose?.(); 
        }}
      />
      <div className={`${lightMode ? 'bg-white text-gray-900 border-gray-300' : 'bg-gray-900 text-gray-100 border-gray-700'} relative z-10 w-[90vw] max-w-md rounded-xl border shadow-xl`}
        role="dialog" aria-modal="true" aria-label="Submission Prompt">
        <div className="p-6">
          <div className="text-xl font-semibold mb-3">Stepwords is open for user submissions!</div>
          <div className={`${lightMode ? 'text-gray-700' : 'text-gray-300'} text-sm mb-6 space-y-2`}>
            <p>
              We would love to include your Stepword puzzles! If you've enjoyed solving puzzles, why not try creating one yourself?
            </p>
            <p>
              Creating puzzles is a fun way to engage with wordplay and share your creativity with the Stepwords community. Your puzzles could be featured on the site!
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { 
                try { localStorage.setItem('stepwords-submission-prompt-shown', '1'); } catch {}; 
                try { if (window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'submission_prompt_dismissed', { action: 'not_now' }); } } catch {}; 
                onClose?.(); 
              }}
              className={`${lightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-gray-700 hover:bg-gray-800'} px-4 py-2 text-sm rounded border`}
            >
              Not now
            </button>
            <Link
              to="/create"
              onClick={handleCreateClick}
              className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create a Puzzle
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

