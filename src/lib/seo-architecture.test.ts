import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRIORITY_DESTINATIONS } from "./site-data";
import { createSeoHead, SITE_IDENTITY_STRUCTURED_DATA, SITE_URL } from "./seo";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const priorityPaths = PRIORITY_DESTINATIONS.map((destination) => destination.to);

describe("BLACKPIPS priority SEO architecture", () => {
  it("uses one stable public destination for each priority feature", () => {
    expect(PRIORITY_DESTINATIONS.map((destination) => destination.label)).toEqual([
      "Trading Journal",
      "Market Sessions",
      "Pips Calculator",
      "Trading Tips",
      "Trading Plan",
    ]);
    expect(new Set(priorityPaths).size).toBe(5);
    expect(priorityPaths).not.toContain("/tips");
    expect(priorityPaths).not.toContain("/dashboard/trading-plan");
  });

  it("generates absolute production canonicals and valid WebPage breadcrumb JSON-LD", () => {
    const head = createSeoHead({
      title: "Market Sessions",
      description: "Timezone-adjusted forex sessions.",
      path: "/tools/market-sessions",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Market Sessions", path: "/tools/market-sessions" },
      ],
    });
    expect(SITE_URL).toBe("https://blackpips.com");
    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://blackpips.com/tools/market-sessions",
    });
    const jsonLd = JSON.parse(head.scripts[0].children);
    expect(jsonLd["@graph"].map((item: { "@type": string }) => item["@type"])).toEqual([
      "WebPage",
      "BreadcrumbList",
    ]);
    expect(JSON.stringify(jsonLd)).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(read("../routes/__root.tsx")).not.toContain('rel: "canonical"');
  });

  it("publishes consistent Organization and WebSite identity data", () => {
    const graph = SITE_IDENTITY_STRUCTURED_DATA["@graph"];
    expect(graph[0]["@type"]).toBe("Organization");
    expect(graph[0].name).toBe("BLACKPIPS");
    expect(graph[1]["@type"]).toBe("WebSite");
    expect(graph[1].url).toBe("https://blackpips.com/");
  });

  it("lists public priority canonicals in the sitemap and keeps private apps out", () => {
    const sitemap = read("../routes/sitemap[.]xml.ts");
    for (const path of priorityPaths) expect(sitemap).toContain(`path: "${path}"`);
    expect(sitemap).not.toContain('path: "/tips"');
    expect(sitemap).not.toContain('path: "/dashboard/trading-plan"');
  });

  it("keeps private application routes blocked and noindexed", () => {
    const robots = read("../../public/robots.txt");
    const tipsApp = read("../routes/_authenticated/tips.tsx");
    const planApp = read("../routes/_authenticated/dashboard.trading-plan.tsx");
    expect(robots).toContain("Disallow: /tips");
    expect(robots).toContain("Disallow: /dashboard");
    expect(tipsApp).toContain("noindex: true");
    expect(planApp).toContain("noindex: true");
    for (const path of priorityPaths) expect(robots).not.toContain(`Disallow: ${path}`);
  });

  it("links all priority destinations from crawlable public navigation surfaces", () => {
    const home = read("../routes/index.tsx");
    const tools = read("../routes/tools.index.tsx");
    const footer = read("../components/Footer.tsx");
    expect(home).toContain("PRIORITY_DESTINATIONS.map");
    expect(tools).toContain("PRIORITY_DESTINATIONS.map");
    expect(footer).toContain("PRIORITY_DESTINATIONS.map");
  });

  it("gives every priority route unique metadata and its own canonical path", () => {
    const routes = [
      ["../routes/tools/trading-journal.tsx", "Trading Journal", "/tools/trading-journal"],
      ["../routes/tools/market-sessions.tsx", "Forex Market Sessions", "/tools/market-sessions"],
      ["../routes/tools/pip-calculator.tsx", "Pips Calculator", "/tools/pip-calculator"],
      ["../routes/trading-tips.tsx", "Trading Tips", "/trading-tips"],
      ["../routes/trading-plan.tsx", "Trading Plan", "/trading-plan"],
    ] as const;
    for (const [file, title, path] of routes) {
      const source = read(file);
      expect(source).toContain(`title: "${title}"`);
      expect(source).toContain(`path: "${path}"`);
      expect(source).toContain("description:");
    }
  });
});
