/**
 * Theme utilities for light/dark mode
 * Defaults to dark mode, saves user preference
 */

/**
 * Get light mode setting from localStorage
 * Defaults to false (dark mode) if not set
 */
export function getInitialLightMode() {
  try {
    const saved = localStorage.getItem('stepwords-settings');
    if (!saved) {
      return false; // Default to dark mode
    }
    
    const settings = JSON.parse(saved);
    return settings.lightMode === true;
  } catch {
    return false; // Default to dark mode on error
  }
}

/**
 * Save light mode preference
 */
export function saveLightModePreference(lightMode) {
  try {
    const existing = localStorage.getItem('stepwords-settings');
    const settings = existing ? JSON.parse(existing) : {};
    settings.lightMode = lightMode;
    localStorage.setItem('stepwords-settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save light mode preference:', error);
  }
}
