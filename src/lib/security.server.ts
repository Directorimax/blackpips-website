import { getRequest } from "@tanstack/react-start/server";

const CANONICAL_ORIGIN = "https://www.blackpips.com";
const DEFAULT_ALLOWED_ORIGINS = new Set([CANONICAL_ORIGIN, "https://blackpips.com"]);

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function configuredOrigins() {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);
  for (const value of [process.env.APP_URL, process.env.SITE_URL, process.env.VERCEL_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value.startsWith("http") ? value : `https://${value}`).origin);
    } catch {
      console.warn("[security] Ignoring an invalid configured application URL.");
    }
  }
  return origins;
}

function supabaseSources() {
  const url = process.env.SUPABASE_URL;
  if (!url) return [];
  try {
    const parsed = new URL(url);
    return [parsed.origin, `wss://${parsed.host}`];
  } catch {
    return [];
  }
}

function contentSecurityPolicy() {
  const connectSources = ["'self'", ...supabaseSources()];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com",
    "media-src 'self' blob: https://*.supabase.co",
    `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com ${supabaseSources()
      .filter((source) => source.startsWith("https://"))
      .join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function enforceRequestSecurity(request: Request): Response | null {
  const url = new URL(request.url);
  const production = process.env.NODE_ENV === "production";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const nonCanonicalProductionHost = production && url.hostname === "blackpips.com";
  if (
    production &&
    (forwardedProto === "http" || url.protocol === "http:" || nonCanonicalProductionHost)
  ) {
    url.protocol = "https:";
    if (nonCanonicalProductionHost) url.hostname = "www.blackpips.com";
    return new Response(null, { status: 308, headers: { Location: url.toString() } });
  }

  const origin = request.headers.get("origin");
  const allowedOrigins = configuredOrigins();
  if (!production) allowedOrigins.add(url.origin);
  if (origin && !allowedOrigins.has(origin)) {
    return new Response("Cross-origin request denied.", { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin ?? CANONICAL_ORIGIN,
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Requested-With",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }
  return null;
}

export function secureResponse(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");
  if (origin && configuredOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.append("Vary", "Origin");
  }
  headers.set("Content-Security-Policy", contentSecurityPolicy());
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Origin-Agent-Cluster", "?1");
  if (!headers.has("Cache-Control") && response.status >= 400) {
    headers.set("Cache-Control", "no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function assertRateLimit(scope: string, limit: number, windowMs: number, subject?: string) {
  const request = getRequest();
  const now = Date.now();
  const key = `${scope}:${subject ?? (request ? clientIp(request) : "unknown")}`;
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    const error = new Error("Too many requests. Please try again later.") as Error & {
      statusCode: number;
    };
    error.statusCode = 429;
    throw error;
  }
  current.count += 1;
  if (rateLimitBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
  }
}
