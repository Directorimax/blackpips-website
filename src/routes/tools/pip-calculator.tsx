import { createFileRoute } from "@tanstack/react-router";
import { PipCalculator } from "@/components/trading-tools";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/tools/pip-calculator")({
  head: () =>
    createSeoHead({
      title: "Pips Calculator",
      description: "Calculate forex pip values quickly with the BLACKPIPS Pips Calculator.",
      path: "/tools/pip-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Pips Calculator", path: "/tools/pip-calculator" },
      ],
    }),
  component: PipCalculatorPage,
});

function PipCalculatorPage() {
  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      <div className="wrap" style={{ maxWidth: 860, padding: "32px 24px 104px" }}>
        <SeoBreadcrumbs current="Pips Calculator" />
        <PipCalculator />
      </div>
    </div>
  );
}
