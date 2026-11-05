import type { ReactNode } from "react";

/**
 * Puts an existing page on the BLACKPIPS design surface: theme tokens, the faint
 * grid backdrop and the soft gold glow, without changing the page's own logic.
 */
export function PageFrame({
  children,
  glow = "soft",
}: {
  children: ReactNode;
  glow?: "soft" | "full";
}) {
  return (
    <div className="bp bp-page bp-legacy">
      <div className={`page-bg ${glow === "soft" ? "soft" : ""}`} aria-hidden="true" />
      <div className="bp-legacy-body">{children}</div>
    </div>
  );
}
