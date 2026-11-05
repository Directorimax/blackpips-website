import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Eye, Target, Users } from "lucide-react";
import { BullMark } from "@/components/Logo";
import { TESTIMONIALS_DATA } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    createSeoHead({
      title: "About BLACKPIPS",
      description:
        "Learn about BLACKPIPS, its approach to structured forex education and the ALC learning framework.",
      path: "/about",
    }),
  component: About,
});

const VALUES = [
  {
    icon: Target,
    title: "Mission",
    body: "To make structured Forex education practical and understandable, helping traders build the skills to analyse the market, manage risk and make their own decisions.",
  },
  {
    icon: Eye,
    title: "Vision",
    body: "To develop independent traders who rely on knowledge, discipline and a repeatable process—not signals or emotional decisions.",
  },
  {
    icon: Users,
    title: "Community",
    body: "A learning environment shaped through live classes, online education and practical market review, where traders are expected to study, journal and improve.",
  },
  {
    icon: Award,
    title: "Why BlackPips",
    body: "BlackPips combines five years of market experience with the ALC Strategy—a framework created to simplify structure, liquidity and execution into a clear trading process.",
  },
];

function About() {
  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      <section className="about-hero">
        <div className="wrap split" style={{ gap: 48 }}>
          <div className="stack" style={{ gap: 22 }}>
            <span className="eyebrow rise" style={{ alignSelf: "flex-start" }}>
              <span className="tag">About</span> Our story
            </span>
            <h1 className="h1 rise d1">
              We teach traders to read the market —{" "}
              <span className="gold-text">not to follow it.</span>
            </h1>
            <p className="lead rise d2">
              BlackPips was built from five years of trading, teaching and refining the ALC
              Strategy. Through live classes, online education and YouTube, we have helped traders
              understand the market so they can analyse, manage risk and make independent decisions.
            </p>
          </div>
          <div className="rise d3 about-mark">
            <div className="spin-slow about-ring" />
            <div className="about-glow" />
            <BullMark className="float about-bull" />
          </div>
        </div>
      </section>

      <section style={{ padding: "32px 0 96px" }}>
        <div className="wrap" style={{ maxWidth: 980 }}>
          <p className="manifesto reveal">
            A trading desk. <b>Not an influencer brand.</b> We don't sell signals. We teach a
            process — <b>structure, liquidity and execution</b> — so every learner can make{" "}
            <b>independent decisions.</b>
          </p>
        </div>
      </section>

      <section style={{ padding: "0 0 96px" }}>
        <div className="wrap">
          <div className="grid-2">
            {VALUES.map((value, i) => (
              <div className="card lift spot val reveal" key={value.title}>
                <div className="between">
                  <span className="ico ico-solid">
                    <value.icon aria-hidden="true" />
                  </span>
                  <span className="vnum">0{i + 1}</span>
                </div>
                <h2 className="h3">{value.title}</h2>
                <p className="small">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 96px" }}>
        <div className="wrap">
          <div className="orbit reveal">
            <div className="orbit-in instructor">
              <div className="instructor-mark">
                <BullMark className="instructor-bull" />
              </div>
              <div className="stack" style={{ gap: 12 }}>
                <p className="kicker">Head Instructor</p>
                <h2 className="h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)" }}>
                  ALC — Lead Trader, BlackPips
                </h2>
                <p className="body">
                  With five years of experience in the Forex market, Blackpips has taught traders
                  through live classes, online programs and YouTube education. During that journey,
                  he developed the ALC Strategy—a practical framework built to help traders
                  understand market structure, liquidity and execution.
                </p>
                <p className="body">
                  His goal is not to create signal followers, but to help every learner develop the
                  confidence, discipline and risk-management skills needed to make independent
                  decisions in the market.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 112px" }}>
        <div className="wrap">
          <div className="between reveal section-head">
            <div>
              <p className="kicker">Testimonials</p>
              <h2 className="h2" style={{ marginTop: 12 }}>
                In our students' words.
              </h2>
            </div>
            <div className="row-wrap">
              <Link to="/faq" className="btn btn-ghost">
                FAQ
              </Link>
              <Link to="/contact" className="btn btn-gold">
                Contact us
              </Link>
            </div>
          </div>
          <div className="grid-2">
            {TESTIMONIALS_DATA.map((t) => (
              <figure className="card spot reveal quote" key={t.name}>
                <QuoteMark />
                <blockquote className="body" style={{ color: "var(--tx-soft)", fontSize: 16 }}>
                  {t.quote}
                </blockquote>
                <figcaption className="row">
                  <span className="quote-avatar">{t.name.charAt(0)}</span>
                  <span className="stack">
                    <span className="h4">{t.name}</span>
                    <span className="small">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function QuoteMark() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#FABE33" aria-hidden="true">
      <path d="M7 7h4v4c0 3-1.5 5-4 6l-.8-1.4C7.6 14.8 8.3 13.6 8.4 12H7V7Zm8 0h4v4c0 3-1.5 5-4 6l-.8-1.4c1.4-.8 2.1-2 2.2-3.6H15V7Z" />
    </svg>
  );
}
