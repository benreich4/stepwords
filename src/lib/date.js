export function formatLongDate(input) {
  const d = input
    ? (typeof input === "string" ? new Date(input) : input)
    : new Date();
  // e.g., "September 4, 2025"
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateWithDayOfWeek(input) {
  const d = input
    ? (typeof input === "string" ? new Date(input) : input)
    : new Date();
  // e.g., "Monday, September 4, 2025"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatShortDate(input) {
  const d = input
    ? (typeof input === "string" ? new Date(input) : input)
    : new Date();
  // e.g., "Sep 4, 2025"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
