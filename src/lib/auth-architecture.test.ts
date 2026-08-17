import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CANONICAL_PRODUCTION_ORIGIN, getAuthCallbackUrl } from "./auth-redirect";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("authentication architecture", () => {
  it("uses the canonical callback from both production hostnames", () => {
    expect(getAuthCallbackUrl({ origin: "https://blackpips.com", hostname: "blackpips.com" })).toBe(
      `${CANONICAL_PRODUCTION_ORIGIN}/auth/callback`,
    );
    expect(
      getAuthCallbackUrl({
        origin: "https://www.blackpips.com",
        hostname: "www.blackpips.com",
      }),
    ).toBe(`${CANONICAL_PRODUCTION_ORIGIN}/auth/callback`);
  });

  it("keeps local development callbacks local", () => {
    expect(getAuthCallbackUrl({ origin: "http://localhost:3000", hostname: "localhost" })).toBe(
      "http://localhost:3000/auth/callback",
    );
  });

  it("has one server exchange authority and no client callback exchange", () => {
    const middleware = read("../integrations/supabase/session-middleware.ts");
    const callback = read("../routes/auth/callback.tsx");
    const passwordReset = read("../routes/reset-password.tsx");

    expect(middleware.match(/exchangeCodeForSession/g)).toHaveLength(1);
    expect(callback).not.toContain("exchangeCodeForSession");
    expect(passwordReset).not.toContain("exchangeCodeForSession");
    expect(callback).not.toContain("PKCE code verifier");
  });

  it("uses compatible SSR cookie clients without auth localStorage", () => {
    const browserClient = read("../integrations/supabase/client.ts");
    const serverClient = read("../integrations/supabase/server.ts");
    const authMiddleware = read("../integrations/supabase/auth-middleware.ts");

    expect(browserClient).toContain("createBrowserClient");
    expect(browserClient).not.toContain("storage: typeof window");
    expect(serverClient).toContain("createServerClient");
    expect(serverClient).toContain("getAll()");
    expect(serverClient).toContain("setAll(cookiesToSet, headers)");
    expect(authMiddleware).toContain("createSupabaseServerClient");
    expect(authMiddleware).toContain("getClaims()");
  });

  it("restores authenticated users and redirects unauthenticated users safely", () => {
    const authProvider = read("../contexts/AuthContext.tsx");
    const protectedLayout = read("../routes/_authenticated/route.tsx");

    expect(authProvider).toContain("supabase.auth.getSession()");
    expect(protectedLayout).toContain("if (!loading && !user");
    expect(protectedLayout).toContain('to: "/auth"');
    expect(protectedLayout).toContain("search: { redirect: intendedUrlRef.current }");
    expect(protectedLayout).toContain("if (loading || !user) return null");
    expect(protectedLayout).toContain("return <Outlet />");
  });
});
