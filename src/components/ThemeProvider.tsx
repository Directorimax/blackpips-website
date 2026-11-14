import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { flushSync } from "react-dom";

type Theme = "dark" | "light";
type Origin = { x: number; y: number };
const ThemeCtx = createContext<{ theme: Theme; toggle: (origin?: Origin) => void }>({
  theme: "dark",
  toggle: () => {},
});

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem("bp-theme")) as Theme | null;
    const initial: Theme = stored ?? "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next: Theme = root.classList.contains("dark") ? "light" : "dark";

    // Swap every colour in one frame: per-element colour transitions are switched off
    // while the theme changes, so no card can be left half dark and half light.
    let applied = false;
    const apply = () => {
      if (applied) return;
      applied = true;
      root.classList.add("theme-switching");
      root.classList.toggle("dark", next === "dark");
      flushSync(() => setTheme(next));
      try {
        localStorage.setItem("bp-theme", next);
      } catch {
        /* storage may be blocked */
      }
    };
    const settle = () => {
      window.setTimeout(() => root.classList.remove("theme-switching"), 60);
    };

    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      apply();
      settle();
      return;
    }

    // A soft crossfade of the whole page: no edges, no sliding, barely noticeable.
    root.classList.add("theme-switching");
    const transition = doc.startViewTransition(apply);
    transition.finished.catch(() => {}).finally(settle);
    // Safety net: if the browser never starts the animation, switch the theme anyway.
    window.setTimeout(() => {
      if (!applied) {
        apply();
        settle();
      }
    }, 400);
  };

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
