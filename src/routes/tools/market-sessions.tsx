import { createFileRoute } from "@tanstack/react-router";
import { MarketSessions } from "@/components/trading-tools";

export const Route = createFileRoute("/tools/market-sessions")({
  head: () => ({
    meta: [
      { title: "Forex Market Hours — BlackPips" },
      {
        name: "description",
        content: "View the Sydney, Tokyo, London and New York Forex sessions in your timezone.",
      },
    ],
  }),
  component: MarketSessionsPage,
});

function MarketSessionsPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-16">
      <MarketSessions />
    </main>
  );
}
