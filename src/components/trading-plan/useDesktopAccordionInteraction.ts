import { useEffect, useRef, useState } from "react";

function useDesktopHover() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 1024px)",
    );
    const update = () => setEnabled(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return enabled;
}

export function useDesktopAccordionInteraction<T extends string>() {
  const [lockedSection, setLockedSection] = useState<T | null>(null);
  const [hoveredSection, setHoveredSection] = useState<T | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopHoverEnabled = useDesktopHover();
  const openSection = lockedSection ?? hoveredSection;

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const onSectionMouseEnter = (section: T) => {
    if (!desktopHoverEnabled || lockedSection) return;

    clearHoverCloseTimer();
    setHoveredSection(section);
  };

  const onSectionMouseLeave = () => {
    if (!desktopHoverEnabled || lockedSection) return;

    clearHoverCloseTimer();
    hoverCloseTimer.current = setTimeout(() => setHoveredSection(null), 200);
  };

  const onSectionClick = (section: T) => {
    clearHoverCloseTimer();
    setHoveredSection(null);
    setLockedSection((current) => (current === section ? null : section));
  };

  useEffect(() => {
    if (!desktopHoverEnabled) setHoveredSection(null);
  }, [desktopHoverEnabled]);

  useEffect(
    () => () => {
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    },
    [],
  );

  return { openSection, onSectionMouseEnter, onSectionMouseLeave, onSectionClick };
}
