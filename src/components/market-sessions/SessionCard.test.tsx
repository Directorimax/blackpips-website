import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getSessionSnapshot } from "@/lib/market-session-engine";
import { SESSION_CONFIG } from "@/lib/market-session.config";
import { SessionCard } from "./SessionCard";

describe("SessionCard", () => {
  it("renders an accessible live session with shared engine data", () => {
    const london = SESSION_CONFIG.find((session) => session.id === "london");
    if (!london) throw new Error("London config missing");

    const session = getSessionSnapshot(
      london,
      new Date("2026-07-13T09:00:00Z"),
      "Africa/Dar_es_Salaam",
      "24h",
    );
    const html = renderToStaticMarkup(<SessionCard session={session} isReady />);

    expect(html).toContain("London");
    expect(html).toContain("London status: Open");
    expect(html).toContain("10:00–19:00");
    expect(html).toContain("EURUSD");
    expect(html).toContain('role="progressbar"');
  });
});
