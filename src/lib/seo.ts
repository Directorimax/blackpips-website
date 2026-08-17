/**
 * Shared, SSR-safe metadata factory for route heads.
 *
 * Keep the public URL here rather than deriving it from `window` so canonical
 * links, crawlers, and TanStack Start SSR all receive the same absolute URL.
 */
export const SITE_URL = "https://www.blackpips.com";

const DEFAULT_DESCRIPTION =
  "BLACKPIPS provides structured forex education, premium lessons, free learning resources and mentorship.";
const DEFAULT_IMAGE = `${SITE_URL}/icon.svg`;

type SeoOptions = {
  title: string;
  description?: string;
  path: string;
  noindex?: boolean;
  type?: "website" | "article";
  breadcrumbs?: ReadonlyArray<{ name: string; path: string }>;
};

export const SITE_IDENTITY_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "BLACKPIPS",
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`,
      },
      sameAs: [
        "https://www.instagram.com/blackpips/",
        "https://www.youtube.com/@blackpips8",
        "https://t.me/blackpips",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "BLACKPIPS",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export function createSeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noindex = false,
  type = "website",
  breadcrumbs = [],
}: SeoOptions) {
  const pageTitle = title === "BLACKPIPS" ? title : `${title} | BLACKPIPS`;
  const canonicalUrl = new URL(path, SITE_URL).toString();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pageTitle,
        description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      ...(breadcrumbs.length > 1
        ? [
            {
              "@type": "BreadcrumbList",
              itemListElement: breadcrumbs.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.name,
                item: new URL(item.path, SITE_URL).toString(),
              })),
            },
          ]
        : []),
    ],
  };

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
    scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
  };
}
