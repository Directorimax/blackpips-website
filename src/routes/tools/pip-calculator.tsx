import { createFileRoute } from "@tanstack/react-router";
import { PipCalculator } from "@/components/trading-tools";

export const Route = createFileRoute("/tools/pip-calculator")({
  head: () => ({ meta: [{ title: "Pip Calculator — BlackPips" }] }),
  component: PipCalculatorPage,
});

function PipCalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <PipCalculator />
    </main>
  );
}
