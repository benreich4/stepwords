import React, { useEffect, useState } from "react";

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { try { localStorage.setItem('stepwords-share-nudge', '1'); } catch {}; try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'share_prompt_dismissed', { action: 'backdrop' }); } } catch {}; onClose?.(); }}
      />
      <div className={`${lightMode ? 'bg-white text-gray-900 border-gray-300' : 'bg-gray-900 text-gray-100 border-gray-700'} relative z-10 w-[90vw] max-w-sm rounded-xl border shadow-xl`}
        role="dialog" aria-modal="true" aria-label="Share Stepwords">
        <div className="p-4">
          <div className="text-lg font-semibold mb-2">Enjoying Stepwords?</div>
          <div className={`${lightMode ? 'text-gray-700' : 'text-gray-300'} text-sm mb-4`}>
            You’ve solved quite a few puzzles. Sharing Stepwords helps others discover the game and supports future improvements — it would be really helpful and greatly appreciated!
          </div>
          {copied && (
            <div className={`mb-3 text-sm ${lightMode ? 'text-emerald-700' : 'text-emerald-300'}`}>Link copied. Thanks for sharing!</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { try { localStorage.setItem('stepwords-share-nudge', '1'); } catch {}; try { if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') { window.gtag('event', 'share_prompt_dismissed', { action: 'not_now' }); } } catch {}; onClose?.(); }}
              className={`${lightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-gray-700 hover:bg-gray-800'} px-3 py-1.5 text-sm rounded border`}
            >
              Not now
            </button>
            <button
              onClick={handleShare}
              className={`px-3 py-1.5 text-sm rounded ${copied ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'} text-white disabled:opacity-70`}
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


