/**
 * Fires a dual-sided confetti explosion centered around a target color.
 */
export function launchAlertConfeti(color) {
  const duration = 2000;
  const end = Date.now() + duration;
  (function frame() {
    if (typeof window.confetti !== 'function') return;
    window.confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: [color, '#ffffff'] });
    window.confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: [color, '#ffffff'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}
