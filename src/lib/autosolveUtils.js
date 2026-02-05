/**
 * Utility functions for autosolve mode
 */

/**
 * Check if autosolve mode is enabled via URL parameter
 */
export function isAutosolveMode() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('autosolve') === '1';
  } catch {
    return false;
  }
}

/**
 * Check if analytics should be sent (returns false in autosolve mode)
 */
export function shouldSendAnalytics() {
  return !isAutosolveMode();
}
