import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clientSource = readFileSync(
  new URL("../integrations/supabase/client.ts", import.meta.url),
  "utf8",
);

describe("production Supabase client configuration", () => {
  it("requires environment configuration without a legacy or credential fallback", () => {
    expect(clientSource).toContain("import.meta.env.VITE_SUPABASE_URL");
    expect(clientSource).toContain("process.env.SUPABASE_URL");
    expect(clientSource).not.toContain("ickerkgpntvokzvldmcj.supabase.co");
    expect(clientSource).not.toMatch(/service[_-]?role/i);
  });
});
