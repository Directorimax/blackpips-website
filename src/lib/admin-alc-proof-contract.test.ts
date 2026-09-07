import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requestSource = readFileSync(
  new URL("../routes/admin/alc-access.tsx", import.meta.url),
  "utf8",
);
const proofSource = readFileSync(
  new URL("../components/admin/AlcVerificationProofs.tsx", import.meta.url),
  "utf8",
);

describe("Admin ALC verification proof contract", () => {
  it("adds a compact proof viewer to every request without changing review RPCs", () => {
    expect(requestSource).toContain("<AlcVerificationProofs requestId={row.id} />");
    expect(requestSource).toContain('"admin_review_alc_access_request_v2"');
    expect(requestSource).toContain("buildAlcReviewArgs");
  });

  it("uses only checked Admin proof RPCs and the canonical private bucket", () => {
    expect(proofSource).toContain('"admin_list_alc_access_request_proofs"');
    expect(proofSource).toContain('"admin_get_alc_request_proof_signed_url_descriptor"');
    expect(proofSource).toContain(".createSignedUrl(");
    expect(proofSource).toContain("ALC_PROOF_BUCKET");
    expect(proofSource).not.toContain("getPublicUrl");
    expect(proofSource).not.toContain("service_role");
  });

  it("renders empty, loading, retry, thumbnail, and modal states independently", () => {
    expect(proofSource).toContain("No proof attached");
    expect(proofSource).toContain("Loading proofs…");
    expect(proofSource).toContain("Secure preview unavailable.");
    expect(proofSource).toContain("<RetryButton");
    expect(proofSource).toContain("<Dialog open={Boolean(activeProof)}");
    expect(proofSource).toContain('type="button"');
  });
});
