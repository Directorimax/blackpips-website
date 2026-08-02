export type PaymentProofKind = "image" | "pdf";

export function getPaymentProofKind(path: string): PaymentProofKind {
  return path.toLowerCase().split("?")[0].endsWith(".pdf") ? "pdf" : "image";
}
