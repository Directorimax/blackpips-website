import { describe, expect, it } from "vitest";
import { getPaymentProofKind } from "./payment-proof";

describe("internal payment-proof preview", () => {
  it("renders supported image proofs in the image viewer", () => {
    expect(getPaymentProofKind("user/payment.webp")).toBe("image");
    expect(getPaymentProofKind("user/payment.jpeg")).toBe("image");
  });

  it("uses the embedded PDF viewer for PDF proofs", () => {
    expect(getPaymentProofKind("user/payment.pdf")).toBe("pdf");
  });
});
