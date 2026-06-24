/**
 * Theme utilities for light/dark mode
 * Defaults to light mode, saves user preference
 */

/** True unless the user explicitly chose dark mode (lightMode: false). */
export function readLightMode(settings) {
  if (!settings || typeof settings !== "object") return true;
  return settings.lightMode !== false;
}

/**
 * Get light mode setting from localStorage
 * Defaults to true (light mode) if not set
 */
export function getInitialLightMode() {
  try {
    const saved = localStorage.getItem("stepwords-settings");
    if (!saved) return true;
    return readLightMode(JSON.parse(saved));
  } catch {
    return true;
  }
}

/**
 * Save light mode preference
 */
export function saveLightModePreference(lightMode) {
  try {
    const existing = localStorage.getItem("stepwords-settings");
    const settings = existing ? JSON.parse(existing) : {};
    settings.lightMode = lightMode;
    localStorage.setItem("stepwords-settings", JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save light mode preference:", error);
  }
}

/** Puzzle date/author header band — collapsed by default unless user expanded ('0'). */
export function readHeaderCollapsed() {
  try {
    return localStorage.getItem("stepwords-header-collapsed") !== "0";
  } catch {
    return true;
  }
}

export function saveHeaderCollapsed(collapsed) {
  try {
    localStorage.setItem("stepwords-header-collapsed", collapsed ? "1" : "0");
  } catch {}
}
