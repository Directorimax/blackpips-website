import { useEffect } from "react";

/**
 * Cards marked .spot get a gold spotlight that follows the cursor, and .tilt3d
 * elements lean toward it. Mouse/trackpad only, and off for reduced motion.
 */
export function PointerEffects() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !finePointer) return;

    let lastTilt: HTMLElement | null = null;
    const resetTilt = (el: HTMLElement | null) => {
      el?.style.setProperty("--rx", "0deg");
      el?.style.setProperty("--ry", "0deg");
    };

    const onMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const spot = target.closest<HTMLElement>(".spot");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${event.clientX - r.left}px`);
        spot.style.setProperty("--my", `${event.clientY - r.top}px`);
      }
      const tilt = target.closest<HTMLElement>(".tilt3d");
      if (lastTilt && lastTilt !== tilt) resetTilt(lastTilt);
      if (tilt) {
        const b = tilt.getBoundingClientRect();
        const px = (event.clientX - b.left) / b.width - 0.5;
        const py = (event.clientY - b.top) / b.height - 0.5;
        const max = Number(tilt.dataset.tilt ?? "6");
        tilt.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
        tilt.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
      }
      lastTilt = tilt;
    };
    const onLeave = () => {
      resetTilt(lastTilt);
      lastTilt = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
