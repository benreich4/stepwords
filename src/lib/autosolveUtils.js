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
 * Check if analytics should be sent (returns false in autosolve mode or when noanalytics=1)
 */
export function shouldSendAnalytics() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    // Disable analytics in autosolve mode or when explicitly disabled
    if (params.get('autosolve') === '1' || params.get('noanalytics') === '1') {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}
