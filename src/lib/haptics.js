/** Light haptic feedback on supported mobile browsers. No-ops elsewhere. */

function vibrate(pattern) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export function hapticTap() {
  vibrate(8);
}

export function hapticRowLock() {
  vibrate([12, 40, 18]);
}

export function hapticSuccess() {
  vibrate([10, 50, 20, 50, 30]);
}

export function hapticError() {
  vibrate([20, 60, 20]);
}

export function hapticWin() {
  vibrate([15, 40, 15, 40, 15, 40, 40]);
}
