import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Target, Eye, Users, Award } from "lucide-react";
import blackPipsLogo from "@/assets/blackpips-bull-gold.png";
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

function About() {
  const reducedMotion = useReducedMotion();
  const reveal = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <motion.header
        className="text-center"
        initial={reducedMotion ? false : "hidden"}
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Our Story
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
          A trading desk. Not an influencer brand.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          BlackPips was built from five years of trading, teaching and refining the ALC Strategy.
          Through live classes, online education and YouTube, we have helped traders understand the
          market so they can analyse, manage risk and make independent decisions.
        </p>
      </motion.header>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {[
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
        ].map((b, index) => (
          <motion.div
            key={b.title}
            className="glass rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-glow motion-reduce:transition-none motion-reduce:hover:transform-none"
            initial={reducedMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            transition={{ duration: 0.45, delay: reducedMotion ? 0 : index * 0.08 }}
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-glow">
              <b.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-semibold">{b.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
          </motion.div>
        ))}
      </div>

      <motion.section
        className="glass mt-10 rounded-3xl p-8 sm:p-12"
        initial={reducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={reveal}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-28 w-28 shrink-0 rounded-full bg-gradient-gold p-[3px] shadow-glow">
            <div className="grid h-full w-full place-items-center rounded-full bg-background">
              <img src={blackPipsLogo} alt="BlackPips" className="h-16 w-16 object-contain" />
            </div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-xs font-semibold uppercase tracking-wide text-gold">
              Head Instructor
            </div>
            <h3 className="mt-1 font-display text-2xl font-bold">ALC — Lead Trader, BlackPips</h3>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                With five years of experience in the Forex market, Blackpips has taught traders
                through live classes, online programs and YouTube education. During that journey, he
                developed the ALC Strategy—a practical framework built to help traders understand
                market structure, liquidity and execution.
              </p>
              <p>
                His goal is not to create signal followers, but to help every learner develop the
                confidence, discipline and risk-management skills needed to make independent
                decisions in the market.
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
