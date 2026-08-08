import { describe, expect, it } from "vitest";
import { alcWhatsAppUrl } from "./alc-access";

describe("ALC Access WhatsApp message", () => {
  it("encodes only safe submitted request details", () => {
    const url = alcWhatsAppUrl(
      {
        fullName: "Jane",
        studyYear: 2020,
        email: "jane@example.com",
        phone: "+255 700 000 000",
        program: "Regular Class",
      },
      "12345678-0000",
    );
    expect(url).toContain("text=");
    expect(decodeURIComponent(url)).toContain("Request reference: 12345678");
    expect(url).not.toContain("admin_notes");
  });
});
