export type EmailVerificationResult = {
  error: { code?: string; name?: string; status?: number } | null;
  sessionEstablished?: boolean;
  userId?: string | null;
};

type EmailConfirmationDependencies = {
  verifyToken: (tokenHash: string) => Promise<EmailVerificationResult>;
  afterVerification?: (userId: string) => Promise<void>;
};

const CONFIRMATION_PATH = "/auth/confirm";
const CONFIRMATION_FAILURE_LOCATION = `${CONFIRMATION_PATH}?status=invalid`;

function redirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Location: location,
      Pragma: "no-cache",
    },
  });
}

/**
 * Verifies signup-email token hashes independently of OAuth PKCE state.
 * Returning null for the cleaned failure URL allows the recovery page to render.
 */
export async function processEmailConfirmationRequest(
  request: Request,
  dependencies: EmailConfirmationDependencies,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== CONFIRMATION_PATH) return null;

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const isCleanedFailure = url.searchParams.get("status") === "invalid" && !tokenHash;

  if (isCleanedFailure) return null;
  if (!tokenHash || tokenHash.length > 2048 || type !== "email") {
    return redirect(CONFIRMATION_FAILURE_LOCATION);
  }

  let result: EmailVerificationResult;
  try {
    result = await dependencies.verifyToken(tokenHash);
  } catch {
    return redirect(CONFIRMATION_FAILURE_LOCATION);
  }
  if (result.error || !result.sessionEstablished) {
    return redirect(CONFIRMATION_FAILURE_LOCATION);
  }

  if (result.userId && dependencies.afterVerification) {
    await dependencies.afterVerification(result.userId);
  }

  return redirect("/dashboard");
}
