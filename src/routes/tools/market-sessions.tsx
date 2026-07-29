import { createFileRoute } from "@tanstack/react-router";
import { MarketSessions } from "@/components/trading-tools";

export const Route = createFileRoute("/tools/market-sessions")({
  head: () => ({ meta: [{ title: "Market Sessions — BlackPips" }] }),
  component: MarketSessionsPage,
});

function MarketSessionsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <MarketSessions />
    </main>
  );
}
