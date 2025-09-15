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
