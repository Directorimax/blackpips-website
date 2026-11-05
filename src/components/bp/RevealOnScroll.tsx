import { useEffect } from "react";

/**
 * Cards marked `.reveal` rise into place as they scroll into view. The class
 * on <html> is only added once this runs, so without JavaScript nothing hides.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add("is-in");
          io.unobserve(el);
          // Drop the stagger once settled so hover effects respond at once.
          window.setTimeout(() => el.style.removeProperty("--reveal-delay"), 1300);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = () => {
      document.querySelectorAll(".reveal:not(.is-in)").forEach((el, i) => {
        if (el.hasAttribute("data-reveal-watched")) return;
        el.setAttribute("data-reveal-watched", "");
        // Siblings that enter together arrive one after another.
        (el as HTMLElement).style.setProperty("--reveal-delay", `${(i % 4) * 70}ms`);
        io.observe(el);
      });
    };
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    // Backup for browsers that delay observer callbacks: never leave a card
    // hidden once it is on screen.
    let queued = false;
    const sweep = () => {
      queued = false;
      const limit = window.innerHeight * 0.95;
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)").forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.top < limit && box.bottom > 0) el.classList.add("is-in");
      });
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      window.setTimeout(sweep, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      mo.disconnect();
      io.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}
