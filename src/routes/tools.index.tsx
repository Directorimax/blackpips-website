import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenText,
  Calculator,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { createSeoHead } from "@/lib/seo";
import { PRIORITY_DESTINATIONS } from "@/lib/site-data";

const TOOL_DETAILS: Record<
  (typeof PRIORITY_DESTINATIONS)[number]["to"],
  { icon: typeof Clock; body: string; solid?: boolean; preview: ReactNode }
> = {
  "/tools/trading-journal": {
    icon: BookOpenText,
    solid: true,
    body: "Log trades with emotions, confidence and plan compliance. Monthly calendar, weekly review and analytics.",
    preview: (
      <div className="prev">
        <div className="between small">
          <span>Your private trade log</span>
          <span className="chip chip-gold">Weekly review</span>
        </div>
        <div className="row-wrap" style={{ gap: 8 }}>
          <span className="chip">P/L</span>
          <span className="chip">Win rate</span>
          <span className="chip">R multiple</span>
          <span className="chip chip-gold">Plan compliance</span>
        </div>
      </div>
    ),
  },
  "/tools/market-sessions": {
    icon: Clock,
    body: "Sydney, Tokyo, London and New York in your timezone — with overlaps, peak hours and alerts.",
    preview: (
      <div className="prev">
        {[
          ["4%", "38%", "#2f4fd8"],
          ["12%", "38%", "#a5108c"],
          ["46%", "38%", "#2f90ee"],
          ["66%", "34%", "#35c13b"],
        ].map(([left, width, background], i) => (
          <div className="sbar" key={background}>
            <i style={{ left, width, background, animationDelay: `${i * 0.1}s` }} />
          </div>
        ))}
      </div>
    ),
  },
  "/tools/pip-calculator": {
    icon: Calculator,
    body: "Pip value, risk amount and recommended lot size by instrument — then add it straight to your journal.",
    preview: (
      <div className="prev">
        <div className="between small">
          <span>EUR/USD · 1 lot</span>
          <span className="mono" style={{ fontWeight: 700, color: "var(--tx)" }}>
            $10.00 / pip
          </span>
        </div>
      </div>
    ),
  },
  "/trading-tips": {
    icon: Lightbulb,
    body: "Access fresh educational insights from BLACKPIPS.",
    preview: (
      <div className="prev">
        <div className="between small">
          <span>New tips from the desk</span>
          <span className="chip chip-gold">Fresh</span>
        </div>
      </div>
    ),
  },
  "/trading-plan": {
    icon: ClipboardCheck,
    body: "Your trader profile, risk limits, daily routine and psychology rules — written down and measurable.",
    preview: (
      <div className="prev">
        <div className="between small">
          <span>Plan completion</span>
          <span className="mono" style={{ fontWeight: 700, color: "var(--tx)" }}>
            5 sections
          </span>
        </div>
        <div className="bar">
          <i style={{ width: "75%" }} />
        </div>
      </div>
    ),
  },
};

export const Route = createFileRoute("/tools/")({
  head: () =>
    createSeoHead({
      title: "Forex Trading Tools",
      description:
        "Explore BLACKPIPS tools for journaling, market sessions, pip calculations, trading insights and structured planning.",
      path: "/tools",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
      ],
    }),
  component: ToolsIndexPage,
});

function ToolsIndexPage() {
  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      <section style={{ position: "relative", padding: "40px 0 48px" }}>
        <div className="wrap center">
          <span className="eyebrow rise">
            <span className="tag">Toolkit</span> Free with every account
          </span>
          <h1 className="h-hero rise d1 tools-title">
            The trader's desk. <span className="gold-text">Built in.</span>
          </h1>
          <p className="lead rise d2" style={{ maxWidth: 620, margin: "22px auto 0" }}>
            Plan the trade, size it, time it, journal it — then review what worked. The same tools
            as the BLACKPIPS app, synced to your account.
          </p>
        </div>
      </section>

      <section style={{ padding: "0 0 104px" }}>
        <div className="wrap">
          <div className="grid-2 tools-grid" style={{ gap: 22 }}>
            {PRIORITY_DESTINATIONS.map((destination) => {
              const tool = TOOL_DETAILS[destination.to];
              return (
                <Link key={destination.to} to={destination.to} className="card lift spot tool rise">
                  <div className="between">
                    <span className={`ico ${tool.solid ? "ico-solid" : ""}`}>
                      <tool.icon aria-hidden="true" />
                    </span>
                    <span className="chip chip-bull">Available</span>
                  </div>
                  <h2 className="h3" style={{ fontSize: 22 }}>
                    {destination.label}
                  </h2>
                  <p className="small">{tool.body}</p>
                  {tool.preview}
                  <span className="go">
                    Open {destination.label} <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="grid-2" style={{ gap: 22, marginTop: 22 }}>
            <div className="card-flat row" style={{ padding: 22, gap: 16 }}>
              <span className="ico">
                <CalendarDays aria-hidden="true" />
              </span>
              <div style={{ flex: 1 }}>
                <p className="h4">Economic Calendar</p>
                <p className="small">U.S. economic releases in your local time.</p>
              </div>
              <span className="chip">Coming soon</span>
            </div>
            <div className="card-flat row" style={{ padding: 22, gap: 16 }}>
              <span className="ico">
                <RefreshCw aria-hidden="true" />
              </span>
              <div style={{ flex: 1 }}>
                <p className="h4">Synced with the app</p>
                <p className="small">Journal, plan and alerts follow your account.</p>
              </div>
              <span className="chip chip-gold">Web + app</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
