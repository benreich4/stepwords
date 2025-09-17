export function parseLocalISODate(input) {
  if (typeof input === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.test(input)) {
    const [y, m, d] = input.split("-").map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  }
  return typeof input === "string" ? new Date(input) : (input || new Date());
}

export function formatLongDate(input) {
  const d = input ? parseLocalISODate(input) : new Date();
  // e.g., "September 4, 2025"
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateWithDayOfWeek(input) {
  const d = input ? parseLocalISODate(input) : new Date();
  // e.g., "Monday, September 4, 2025"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatShortDate(input) {
  const d = input ? parseLocalISODate(input) : new Date();
  // e.g., "Sep 4, 2025"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// Returns today's date in Eastern Time as YYYY-MM-DD
export function getTodayIsoInET() {
  try {
    // en-CA yields YYYY-MM-DD format
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    // Fallback to UTC if Intl/timeZone unsupported
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

// Preview mode helper: enable via localStorage flag set by a URL param handler in App
export function isPreviewEnabled() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const p = params.get('preview');
    if (p === 'on') { try { localStorage.setItem('stepwords-preview', '1'); } catch {} return true; }
    if (p === 'off') { try { localStorage.removeItem('stepwords-preview'); } catch {} return false; }
    return localStorage.getItem('stepwords-preview') === '1';
  } catch {
    return false;
  }
}
