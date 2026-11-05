import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      data-theme-toggle
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="icon-btn"
    >
      <Sun className="theme-ico-sun" aria-hidden="true" />
      <Moon className="theme-ico-moon" aria-hidden="true" />
    </button>
  );
}
