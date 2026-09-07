export const ALC_PROOF_BUCKET = "alc-verification-proofs";
export const ALC_PROOF_EXPIRY_SAFETY_SECONDS = 30;

export function proofAttachmentLabel(count: number): string {
  return `${count} ${count === 1 ? "attachment" : "attachments"}`;
}

export function isSignedProofFresh(expiresAt: number | undefined, now = Date.now()): boolean {
  return Boolean(expiresAt && expiresAt > now + ALC_PROOF_EXPIRY_SAFETY_SECONDS * 1000);
}
