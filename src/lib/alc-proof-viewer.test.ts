import { describe, expect, it } from "vitest";
import { isSignedProofFresh, proofAttachmentLabel } from "./alc-proof-viewer";

describe("ALC verification proof viewer", () => {
  it("formats one and multiple proof counts", () => {
    expect(proofAttachmentLabel(1)).toBe("1 attachment");
    expect(proofAttachmentLabel(2)).toBe("2 attachments");
  });

  it("regenerates URLs that are expired or too close to expiry", () => {
    const now = 1_000_000;
    expect(isSignedProofFresh(undefined, now)).toBe(false);
    expect(isSignedProofFresh(now + 20_000, now)).toBe(false);
    expect(isSignedProofFresh(now + 31_000, now)).toBe(true);
  });
});
