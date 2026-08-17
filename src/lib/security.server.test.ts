import { afterEach, describe, expect, it } from "vitest";
import { enforceRequestSecurity, secureResponse } from "./security.server";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe("request security", () => {
  it("permanently redirects production HTTP requests to HTTPS", () => {
    process.env.NODE_ENV = "production";
    const response = enforceRequestSecurity(new Request("http://www.blackpips.com/about"));
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.blackpips.com/about");
  });

  it("redirects the production apex host to the canonical www host", () => {
    process.env.NODE_ENV = "production";
    const response = enforceRequestSecurity(
      new Request("https://blackpips.com/auth/callback?code=secret"),
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.blackpips.com/auth/callback?code=secret",
    );
  });

  it("rejects unapproved cross-origin requests", () => {
    const request = new Request("https://blackpips.com/", {
      headers: { Origin: "https://attacker.example" },
    });
    expect(enforceRequestSecurity(request)?.status).toBe(403);
  });

  it("adds the production security header set", () => {
    const request = new Request("https://blackpips.com/");
    const response = secureResponse(new Response("ok"), request);
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("content-security-policy")).toContain(
      "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.tradingview.com",
    );
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
  });
});
