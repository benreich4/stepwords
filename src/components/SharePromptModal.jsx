import React, { useEffect, useState } from "react";
import { shouldSendAnalytics } from "../lib/autosolveUtils.js";

export default function SharePromptModal({ onClose, lightMode }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'share_prompt_shown', {});
        window.gtag('event', 'special_alert', { alert_name: 'share_prompt' });
      }
    } catch {}
  }, []);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const msg = "Check out Stepwords! https://stepwords.xyz";
    try {
      if (navigator.share) {
        // Share the full message as text (no url field) so platforms don't override with current URL
        await navigator.share({ text: msg });
        try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'share_prompt_shared', { method: 'web_share' }); } } catch {}
      } else {
        await navigator.clipboard.writeText(msg);
        setCopied(true);
        // brief, natural auto-close after showing copied state
        setTimeout(() => { try { localStorage.setItem('stepwords-share-nudge', '1'); } catch {}; onClose?.(); }, 900);
        try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'share_prompt_shared', { method: 'clipboard' }); } } catch {}
      }
    } catch (_) { /* ignore */ }
    finally {
      // If Web Share API succeeded, close immediately
      try { localStorage.setItem('stepwords-share-nudge', '1'); } catch {}
      if (navigator.share) onClose?.();
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-navyink-900/60 backdrop-blur-sm"
        onClick={() => { try { localStorage.setItem('stepwords-share-nudge', '1'); } catch {}; try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'share_prompt_dismissed', { action: 'backdrop' }); } } catch {}; onClose?.(); }}
      />
      <div className={`${lightMode ? 'bg-parchment-50 text-navyink-900 border-parchment-200' : 'bg-navyink-850 text-parchment-50 border-navyink-700'} relative z-10 w-[90vw] max-w-sm rounded-3xl border shadow-2xl animate-fade-in-up`}
        role="dialog" aria-modal="true" aria-label="Share Stepwords">
        <div className="p-6">
          <div className="font-serif text-xl font-bold mb-2">Enjoying Stepwords?</div>
          <div className={`${lightMode ? 'text-navyink-700/75' : 'text-parchment-200/65'} text-[15px] leading-relaxed mb-5`}>
            You've solved quite a few puzzles. Sharing Stepwords helps others discover the game and supports future improvements — it would be really appreciated!
          </div>
          {copied && (
            <div className={`mb-3 text-sm ${lightMode ? 'text-emerald-700' : 'text-emerald-300'}`}>Link copied. Thanks for sharing!</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { try { localStorage.setItem('stepwords-share-nudge', '1'); } catch {}; try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'share_prompt_dismissed', { action: 'not_now' }); } } catch {}; onClose?.(); }}
              className={`${lightMode ? 'border-parchment-300 text-navyink-700 hover:bg-parchment-100' : 'border-navyink-600 text-parchment-200 hover:bg-navyink-700'} px-4 py-2 text-sm rounded-full border`}
            >
              Not now
            </button>
            <button
              onClick={handleShare}
              className={`px-4 py-2 text-sm font-semibold rounded-full text-white shadow-sm disabled:opacity-70 transition-colors ${copied ? 'bg-emerald-600 hover:bg-emerald-600' : (lightMode ? 'bg-brand-700 hover:bg-brand-800' : 'bg-brand-600 hover:bg-brand-500')}`}
              disabled={sharing}
            >
              {copied ? 'Copied!' : (sharing ? 'Sharing…' : 'Share Stepwords')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


