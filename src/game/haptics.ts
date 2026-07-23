// Lightweight web haptics. Unsupported browsers simply ignore vibration.
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

export const Haptic = {
  light() {
    vibrate(8);
  },
  medium() {
    vibrate(15);
  },
  heavy() {
    vibrate([20, 30, 20]);
  },
  success() {
    vibrate([10, 40, 10]);
  },
  error() {
    vibrate([50, 80, 50]);
  },
  selection() {
    vibrate(5);
  },
};
