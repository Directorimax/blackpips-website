export type PaymentRecord = {
  id: string;
  status: string;
  created_at: string | null;
  proof_url?: string | null;
};

export type PaymentSubmissionStage = "proof-upload" | "payment-record";

export class PaymentSubmissionError extends Error {
  readonly stage: PaymentSubmissionStage;
  readonly proofPathRetained: boolean;
  readonly proofPath: string | null;
  readonly cause: unknown;

  constructor(
    stage: PaymentSubmissionStage,
    cause: unknown,
    options: { proofPathRetained?: boolean; proofPath?: string } = {},
  ) {
    super(errorMessage(cause) || "Payment submission failed");
    this.name = "PaymentSubmissionError";
    this.stage = stage;
    this.proofPathRetained = options.proofPathRetained ?? false;
    this.proofPath = options.proofPath ?? null;
    this.cause = cause;
  }
}

type Result<T> = { data: T; error: null } | { data: null; error: unknown };

export type PaymentSubmissionOperations = {
  uploadProof: () => Promise<Result<{ path: string }>>;
  createPayment: (proofPath: string) => Promise<Result<PaymentRecord>>;
  findPayment: () => Promise<Result<PaymentRecord | null>>;
  removeProof: (proofPath: string) => Promise<{ error: unknown | null }>;
};

export type PaymentSubmissionResult = {
  payment: PaymentRecord;
  proofPath: string;
  recoveredExistingPayment: boolean;
};

/**
 * Completes the two-stage payment submission without treating an ambiguous POST
 * response as a definite failure. A follow-up read makes retries idempotent and
 * prevents a committed payment from losing its proof during cleanup.
 */
export async function submitPaymentRecord(
  operations: PaymentSubmissionOperations,
  existingProofPath?: string | null,
): Promise<PaymentSubmissionResult> {
  let proofPath = existingProofPath ?? null;

  if (!proofPath) {
    const upload = await operations.uploadProof();
    if (upload.error) throw new PaymentSubmissionError("proof-upload", upload.error);
    proofPath = upload.data.path;
  }

  const inserted = await operations.createPayment(proofPath);
  if (!inserted.error) {
    return { payment: inserted.data, proofPath, recoveredExistingPayment: false };
  }

  // The insert may have committed even if the browser did not receive its
  // response. It may also be a retry of an already-recorded transaction.
  const reconciliation = await operations.findPayment();
  if (!reconciliation.error && reconciliation.data) {
    const recordedProofPath = reconciliation.data.proof_url;
    if (recordedProofPath && recordedProofPath !== proofPath) {
      await operations.removeProof(proofPath);
    }
    return {
      payment: reconciliation.data,
      proofPath: recordedProofPath || proofPath,
      recoveredExistingPayment: true,
    };
  }

  if (reconciliation.error && isNetworkError(inserted.error)) {
    // Keep the uploaded proof for a safe retry: deleting it could break a row
    // that committed while the response was lost.
    throw new PaymentSubmissionError("payment-record", inserted.error, {
      proofPathRetained: true,
      proofPath,
    });
  }

  await operations.removeProof(proofPath);
  throw new PaymentSubmissionError("payment-record", inserted.error);
}

export function getPaymentSubmissionErrorMessage(error: unknown) {
  if (error instanceof PaymentSubmissionError) {
    if (error.stage === "proof-upload") {
      return "We could not upload your payment proof. Please try again.";
    }
    if (error.proofPathRetained) {
      return "We could not confirm your payment submission. Your proof is safe; please try submitting again.";
    }
  }

  const message = errorMessage(error);
  if (/auth session missing|session.*expired|jwt.*expired/i.test(message)) {
    return "Your session has expired. Please sign in again.";
  }
  if (/row-level security|policy/i.test(message)) {
    return "We could not save your payment because your account does not have permission. Please contact support.";
  }
  if (/network|fetch/i.test(message)) {
    return "Network error. Please check your connection and try again.";
  }
  return "We could not submit your payment. Please try again.";
}

export function isNetworkError(error: unknown) {
  return /network|fetch|load failed|connection/i.test(errorMessage(error));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}
