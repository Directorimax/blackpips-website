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
    <main className="mx-auto max-w-3xl px-4 py-16">
      <SeoBreadcrumbs current="Pips Calculator" />
      <PipCalculator />
    </main>
  );
}
