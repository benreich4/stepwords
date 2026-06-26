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

/** Milliseconds until the next midnight in America/New_York. */
export function getMsUntilMidnightET() {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    const h = get('hour');
    const min = get('minute');
    const sec = get('second');
    const msInDay = 24 * 60 * 60 * 1000;
    const msSinceMidnight = ((h * 60 + min) * 60 + sec) * 1000;
    return Math.max(0, msInDay - msSinceMidnight);
  } catch {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    return Math.max(0, end.getTime() - now.getTime());
  }
}

export function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "<1m";
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DIFFICULTY_BY_DOW = ['Medium', 'Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard'];

export function getTodayWeekdayIndexET() {
  try {
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(new Date());
    const idx = WEEKDAY_LABELS.indexOf(wd);
    return idx >= 0 ? idx : new Date().getDay();
  } catch {
    return new Date().getDay();
  }
}

export function getWeekdayDifficulty(dowIndex) {
  return DIFFICULTY_BY_DOW[dowIndex] || 'Medium';
}

export function getWeekArc() {
  const today = getTodayWeekdayIndexET();
  return WEEKDAY_LABELS.map((label, i) => ({
    label,
    difficulty: getWeekdayDifficulty(i),
    isToday: i === today,
  }));
}

/** Last N calendar dates ending today (ET), oldest first. */
export function getRecentDatesET(count = 7) {
  const today = parseLocalISODate(getTodayIsoInET());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - i));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
}

export function formatShortWeekday(isoDate) {
  const d = parseLocalISODate(isoDate);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
}

export function dayOfMonth(isoDate) {
  return parseLocalISODate(isoDate).getDate();
}

/** Monday's ISO date (YYYY-MM-DD) for the ET week containing `dateIso`. */
export function getWeekKeyET(dateIso) {
  const d = parseLocalISODate(dateIso);
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekDatesFromKey(weekKey) {
  const start = parseLocalISODate(weekKey);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
}

/** Whole calendar days from `fromIso` to `toIso` (YYYY-MM-DD). */
export function calendarDaysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const parse = (iso) => {
    const [y, m, d] = String(iso).split("T")[0].split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(toIso) - parse(fromIso)) / 86_400_000);
}
