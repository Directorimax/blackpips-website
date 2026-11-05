import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, ShieldCheck, Target } from "lucide-react";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";
import { createSeoHead } from "@/lib/seo";
import { PageFrame } from "@/components/bp/PageFrame";

export const Route = createFileRoute("/trading-plan")({
  head: () =>
    createSeoHead({
      title: "Trading Plan",
      description: "Build and manage a structured trading plan with BLACKPIPS.",
      path: "/trading-plan",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Trading Plan", path: "/trading-plan" },
      ],
    }),
  component: () => (
    <PageFrame>
      <TradingPlanLanding />
    </PageFrame>
  ),
});

function TradingPlanLanding() {
  return (
    <main className="wrap plan-page">
      <SeoBreadcrumbs current="Trading Plan" />
      <section className="orbit rise" style={{ marginTop: 16 }}>
        <div className="orbit-in" style={{ padding: "clamp(28px, 5vw, 56px)" }}>
          <span className="ico ico-solid">
            <ClipboardCheck aria-hidden="true" />
          </span>
          <h1 className="h1" style={{ marginTop: 20 }}>
            Trading Plan
          </h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: 640 }}>
            Create a private, structured plan for markets, sessions, risk limits, routines and
            trading rules.
          </p>
          <div className="grid-2" style={{ gap: 12, marginTop: 28 }}>
            <Feature icon={Target} text="Define markets, sessions and execution rules" />
            <Feature icon={ShieldCheck} text="Set risk limits and review routines" />
          </div>
          <div className="row-wrap" style={{ gap: 12, marginTop: 28, alignItems: "center" }}>
            <Link to="/dashboard/trading-plan" className="btn btn-gold">
              Open Trading Plan <ArrowRight aria-hidden="true" />
            </Link>
            <span className="small" style={{ fontSize: 12 }}>
              Authentication is required.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Target; text: string }) {
  return (
    <div className="card-flat row" style={{ gap: 12, padding: 16 }}>
      <span className="ico">
        <Icon aria-hidden="true" />
      </span>
      <span className="h4" style={{ fontWeight: 600 }}>
        {text}
      </span>
    </div>
  );
}
