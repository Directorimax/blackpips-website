/**
 * Shared, SSR-safe metadata factory for route heads.
 *
 * Keep the public URL here rather than deriving it from `window` so canonical
 * links, crawlers, and TanStack Start SSR all receive the same absolute URL.
 */
export const SITE_URL = "https://blackpips.com";

const DEFAULT_DESCRIPTION =
  "BLACKPIPS provides structured forex education, premium lessons, free learning resources and mentorship.";
const DEFAULT_IMAGE = `${SITE_URL}/icon.svg`;

type SeoOptions = {
  title: string;
  description?: string;
  path: string;
  noindex?: boolean;
  type?: "website" | "article";
};

export function createSeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noindex = false,
  type = "website",
}: SeoOptions) {
  const pageTitle = title === "BLACKPIPS" ? title : `${title} | BLACKPIPS`;
  const canonicalUrl = new URL(path, SITE_URL).toString();

  return {
    meta: [
      { title: pageTitle },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: canonicalUrl },
      { property: "og:site_name", content: "BLACKPIPS" },
      { property: "og:image", content: DEFAULT_IMAGE },
      { property: "og:image:alt", content: "BLACKPIPS" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: DEFAULT_IMAGE },
      { name: "twitter:image:alt", content: "BLACKPIPS" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
  };
}
