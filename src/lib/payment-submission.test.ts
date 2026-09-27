import { describe, expect, it, vi } from "vitest";
import {
  getPaymentSubmissionErrorMessage,
  PaymentSubmissionError,
  submitPaymentRecord,
  type PaymentSubmissionOperations,
} from "./payment-submission";

const payment = {
  id: "payment-1",
  status: "pending",
  created_at: "2026-09-27T08:00:00.000Z",
  proof_url: "user/course/proof.webp",
};

function operations(
  overrides: Partial<PaymentSubmissionOperations> = {},
): PaymentSubmissionOperations {
  return {
    uploadProof: vi.fn().mockResolvedValue({
      data: { path: "user/course/proof.webp" },
      error: null,
    }),
    createPayment: vi.fn().mockResolvedValue({ data: payment, error: null }),
    findPayment: vi.fn().mockResolvedValue({ data: null, error: null }),
    removeProof: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

describe("payment submission", () => {
  it("reports success only after both proof upload and payment insert succeed", async () => {
    const ops = operations();

    await expect(submitPaymentRecord(ops)).resolves.toEqual({
      payment,
      proofPath: payment.proof_url,
      recoveredExistingPayment: false,
    });
    expect(ops.uploadProof).toHaveBeenCalledOnce();
    expect(ops.createPayment).toHaveBeenCalledWith(payment.proof_url);
    expect(ops.removeProof).not.toHaveBeenCalled();
  });

  it("stops before the database insert when proof upload fails", async () => {
    const ops = operations({
      uploadProof: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "storage unavailable" },
      }),
    });

    await expect(submitPaymentRecord(ops)).rejects.toMatchObject({
      stage: "proof-upload",
    });
    expect(ops.createPayment).not.toHaveBeenCalled();
  });

  it("removes the uploaded proof after a definite payment insert failure", async () => {
    const ops = operations({
      createPayment: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "row-level security policy" },
      }),
    });

    await expect(submitPaymentRecord(ops)).rejects.toMatchObject({
      stage: "payment-record",
      proofPathRetained: false,
    });
    expect(ops.findPayment).toHaveBeenCalledOnce();
    expect(ops.removeProof).toHaveBeenCalledWith(payment.proof_url);
  });

  it("recovers a payment that committed despite a lost insert response", async () => {
    const ops = operations({
      createPayment: vi.fn().mockResolvedValue({
        data: null,
        error: new TypeError("Failed to fetch"),
      }),
      findPayment: vi.fn().mockResolvedValue({ data: payment, error: null }),
    });

    await expect(submitPaymentRecord(ops)).resolves.toMatchObject({
      payment,
      recoveredExistingPayment: true,
    });
    expect(ops.removeProof).not.toHaveBeenCalled();
  });

  it("makes a duplicate retry idempotent and removes only its new unused proof", async () => {
    const existing = { ...payment, proof_url: "user/course/original.webp" };
    const ops = operations({
      createPayment: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      }),
      findPayment: vi.fn().mockResolvedValue({ data: existing, error: null }),
    });

    await expect(submitPaymentRecord(ops)).resolves.toEqual({
      payment: existing,
      proofPath: existing.proof_url,
      recoveredExistingPayment: true,
    });
    expect(ops.removeProof).toHaveBeenCalledWith(payment.proof_url);
  });

  it("retains the proof when both insert and reconciliation have network failures", async () => {
    const ops = operations({
      createPayment: vi.fn().mockResolvedValue({
        data: null,
        error: new TypeError("Failed to fetch"),
      }),
      findPayment: vi.fn().mockResolvedValue({
        data: null,
        error: new TypeError("Failed to fetch"),
      }),
    });

    const failure = await submitPaymentRecord(ops).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(PaymentSubmissionError);
    expect(failure).toMatchObject({
      stage: "payment-record",
      proofPathRetained: true,
      proofPath: payment.proof_url,
    });
    expect(ops.removeProof).not.toHaveBeenCalled();
    expect(getPaymentSubmissionErrorMessage(failure)).toContain("proof is safe");
  });

  it("reuses a retained proof rather than uploading it again", async () => {
    const ops = operations();

    await submitPaymentRecord(ops, payment.proof_url);

    expect(ops.uploadProof).not.toHaveBeenCalled();
    expect(ops.createPayment).toHaveBeenCalledWith(payment.proof_url);
  });

  it("does not expose raw database messages to users", () => {
    const error = new PaymentSubmissionError("payment-record", {
      message: "duplicate key value violates unique constraint payments_transaction_id_key",
    });

    expect(getPaymentSubmissionErrorMessage(error)).toBe(
      "We could not submit your payment. Please try again.",
    );
  });
});
