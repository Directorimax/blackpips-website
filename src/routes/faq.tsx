import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { FAQ_GROUPS } from "@/lib/site-data";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ - BLACKPIPS" },
      {
        name: "description",
        content:
          "Frequently asked questions about BLACKPIPS courses, payments, mentorship, trading education and support.",
      },
      { property: "og:title", content: "BLACKPIPS FAQ" },
      { property: "og:description", content: "Courses, payments, mentorship and support." },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const group = FAQ_GROUPS[groupIndex];

  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      <section style={{ padding: "32px 0 96px" }}>
        <div className="wrap">
          <div className="split faq-layout">
            <div className="stack" style={{ gap: 18 }}>
              <span className="eyebrow rise" style={{ alignSelf: "flex-start" }}>
                <span className="tag">Help</span> FAQ
              </span>
              <h1 className="h1 rise d1">Frequently asked questions.</h1>
              <p className="body rise d2">
                Can't find it? Message us on WhatsApp — we usually reply the same day.
              </p>
              <div className="row-wrap rise d3" style={{ gap: 8, marginTop: 6 }} role="tablist">
                {FAQ_GROUPS.map((item, i) => (
                  <button
                    key={item.title}
                    type="button"
                    role="tab"
                    aria-selected={groupIndex === i}
                    className={`pick ${groupIndex === i ? "on" : ""}`}
                    onClick={() => {
                      setGroupIndex(i);
                      setOpen(0);
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              <Link
                to="/contact"
                className="btn btn-ghost rise d4"
                style={{ alignSelf: "flex-start" }}
              >
                Contact support
              </Link>
            </div>
            <div className="stack" style={{ gap: 10 }} key={group.title}>
              {group.items.map((item, i) => {
                const isOpen = open === i;
                return (
                  <div
                    className={`card rise ${isOpen ? "faq-open" : ""}`}
                    style={{ borderRadius: 16, animationDelay: `${i * 0.05}s` }}
                    key={item.q}
                  >
                    <button
                      type="button"
                      className="faq-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      {item.q}
                      <Plus aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <p
                        className="body rise"
                        style={{ padding: "0 22px 20px", animationDuration: ".5s" }}
                      >
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
