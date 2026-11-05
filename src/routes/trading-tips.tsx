import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, Images, Sparkles } from "lucide-react";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";
import { createSeoHead } from "@/lib/seo";
import { PageFrame } from "@/components/bp/PageFrame";

export const Route = createFileRoute("/trading-tips")({
  head: () =>
    createSeoHead({
      title: "Trading Tips",
      description: "Access fresh BLACKPIPS trading insights and educational market tips.",
      path: "/trading-tips",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Trading Tips", path: "/trading-tips" },
      ],
    }),
  component: () => (
    <PageFrame>
      <TradingTipsLanding />
    </PageFrame>
  ),
});

function TradingTipsLanding() {
  return (
    <main className="wrap plan-page">
      <SeoBreadcrumbs current="Trading Tips" />
      <section className="orbit rise" style={{ marginTop: 16 }}>
        <div className="orbit-in" style={{ padding: "clamp(28px, 5vw, 56px)" }}>
          <span className="ico ico-solid">
            <Sparkles aria-hidden="true" />
          </span>
          <h1 className="h1" style={{ marginTop: 20 }}>
            Trading Tips
          </h1>
          <p className="lead" style={{ marginTop: 14, maxWidth: 640 }}>
            Read timely educational market observations from the BLACKPIPS desk in a private members
            feed.
          </p>
          <div className="grid-2" style={{ gap: 12, marginTop: 28 }}>
            <Feature icon={Clock3} text="Fresh insights with clear publication timing" />
            <Feature icon={Images} text="Chart media and concise educational context" />
          </div>
          <div className="row-wrap" style={{ gap: 12, marginTop: 28, alignItems: "center" }}>
            <Link to="/tips" className="btn btn-gold">
              Open Trading Tips <ArrowRight aria-hidden="true" />
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

function Feature({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
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
