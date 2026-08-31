import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_DESTINATION,
  buildInternalLocationPath,
  getSafeRedirect,
  isAuthRoutePath,
} from "./auth-redirect";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("protected-route authentication redirects", () => {
  it("preserves one valid internal protected destination including query and hash", () => {
    expect(
      buildInternalLocationPath({
        pathname: "/admin/lessons",
        searchStr: "?course=regular",
        hash: "media",
      }),
    ).toBe("/admin/lessons?course=regular#media");
    expect(getSafeRedirect("/admin/lessons?course=regular#media")).toBe(
      "/admin/lessons?course=regular#media",
    );
  });

  it("does not accept the auth page as its own redirect destination", () => {
    expect(isAuthRoutePath("/auth")).toBe(true);
    expect(getSafeRedirect("/auth")).toBeNull();

    const authPage = read("../routes/auth.index.tsx");
    expect(authPage).toContain(
      "if (loading || user || redirect === undefined || getSafeRedirect(redirect)) return;",
    );
    expect(authPage).toContain("redirect: undefined");
  });

  it("sanitizes recursively nested auth redirects", () => {
    expect(
      getSafeRedirect("/auth?redirect=%2Fauth%3Fredirect%3D%252Fadmin%252Flessons"),
    ).toBeNull();
  });

  it("rejects external, protocol-relative, and executable redirect values", () => {
    expect(getSafeRedirect("https://attacker.example/phish")).toBeNull();
    expect(getSafeRedirect("//attacker.example/phish")).toBeNull();
    expect(getSafeRedirect("javascript:alert(1)")).toBeNull();
    expect(getSafeRedirect("data:text/html,unsafe")).toBeNull();
  });

  it("falls back to the established post-login destination for invalid values", () => {
    expect(getSafeRedirect("/auth?redirect=/admin/lessons") ?? DEFAULT_AUTH_DESTINATION).toBe(
      "/dashboard",
    );
  });

  it("keeps the shared guard to one redirect while authenticated users remain unaffected", () => {
    const guard = read("../components/AuthenticatedRouteGuard.tsx");

    expect(guard).toContain("if (user)");
    expect(guard).toContain("hasRedirectedRef.current = false");
    expect(guard).toContain("if (!loading && !hasRedirectedRef.current)");
    expect(guard).toContain("hasRedirectedRef.current = true");
    expect(guard).toContain('to: "/auth"');
  });

  it("keeps admin routes behind the shared authenticated guard", () => {
    const adminLessons = read("../routes/admin/lessons.tsx");

    expect(adminLessons).toContain("<AuthenticatedRouteGuard>");
    expect(adminLessons).toContain("<AdminLessons />");
  });
});
