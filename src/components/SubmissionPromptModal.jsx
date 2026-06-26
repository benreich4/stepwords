import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { shouldSendAnalytics } from "../lib/autosolveUtils.js";

export default function SubmissionPromptModal({ onClose, lightMode }) {
  useEffect(() => {
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'submission_prompt_shown', {});
      }
    } catch {}
  }, []);

  const handleCreateClick = () => {
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'submission_prompt_create_clicked', {});
      }
    } catch {}
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-navyink-900/60 backdrop-blur-sm"
        onClick={() => { 
          try { localStorage.setItem('stepwords-submission-prompt-shown', '1'); } catch {}; 
          try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'submission_prompt_dismissed', { action: 'backdrop' }); } } catch {}; 
          onClose?.(); 
        }}
      />
      <div className={`${lightMode ? 'bg-parchment-50 text-navyink-900 border-parchment-200' : 'bg-navyink-850 text-parchment-50 border-navyink-700'} relative z-10 w-[90vw] max-w-md rounded-3xl border shadow-2xl animate-fade-in-up`}
        role="dialog" aria-modal="true" aria-label="Submission Prompt">
        <div className="p-6">
          <div className="font-serif text-xl font-bold mb-3">Stepwords is open for submissions!</div>
          <div className={`${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'} text-[15px] leading-relaxed mb-6 space-y-2`}>
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
                try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'submission_prompt_dismissed', { action: 'not_now' }); } } catch {}; 
                onClose?.(); 
              }}
              className={`${lightMode ? 'border-parchment-300 text-navyink-700 hover:bg-parchment-100' : 'border-navyink-600 text-parchment-200 hover:bg-navyink-700'} px-4 py-2 text-sm rounded-full border`}
            >
              Not now
            </button>
            <Link
              to="/create"
              onClick={handleCreateClick}
              className={`px-4 py-2 text-sm font-semibold rounded-full text-white shadow-sm transition-colors ${lightMode ? 'bg-brand-700 hover:bg-brand-800' : 'bg-brand-600 hover:bg-brand-500'}`}
            >
              Create a Puzzle
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

