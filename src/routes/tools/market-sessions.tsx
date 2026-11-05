import { createFileRoute } from "@tanstack/react-router";
import { MarketSessions } from "@/components/trading-tools";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/tools/market-sessions")({
  head: () =>
    createSeoHead({
      title: "Forex Market Sessions",
      description:
        "View major forex market sessions, opening hours and timezone-adjusted trading times with BLACKPIPS.",
      path: "/tools/market-sessions",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Market Sessions", path: "/tools/market-sessions" },
      ],
    }),
  component: MarketSessionsPage,
});

function MarketSessionsPage() {
  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      <div className="wrap-wide" style={{ padding: "32px 24px 104px" }}>
        <SeoBreadcrumbs current="Market Sessions" />
        <MarketSessions />
      </div>
    </div>
  );
}
