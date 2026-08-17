type SignupAuthError = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

type SignupUser = {
  confirmation_sent_at?: string | null;
  identities?: unknown[] | null;
};

type SignupData = {
  session: unknown | null;
  user: SignupUser | null;
};

export type SignupOutcome =
  | { status: "signed-in" }
  | { status: "confirmation-accepted" }
  | {
      status: "failed";
      category:
        | "already-registered"
        | "delivery-provider"
        | "invalid-email"
        | "rate-limit"
        | "signup-disabled"
        | "unknown";
      message: string;
    };

const RETRY_OR_SUPPORT =
  "We couldn't create your account or send the verification email. Please try again or contact support.";

export function classifySignupResult(
  data: SignupData,
  error: SignupAuthError | null,
): SignupOutcome {
  if (error) return classifySignupError(error);

  if (data.session && data.user) return { status: "signed-in" };
  if (!data.user) return failed("unknown", RETRY_OR_SUPPORT);

  // With email confirmation enabled, Supabase deliberately returns an
  // obfuscated user with no identities for an existing email. No message is sent.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return failed(
      "already-registered",
      "This email may already have a BLACKPIPS account. Try signing in or resetting your password.",
    );
  }

  // This timestamp is Supabase's acknowledgement that the confirmation send
  // was accepted. It does not claim inbox delivery or bypass provider bounces.
  if (
    typeof data.user.confirmation_sent_at === "string" ||
    (Array.isArray(data.user.identities) && data.user.identities.length > 0)
  ) {
    return { status: "confirmation-accepted" };
  }

  return failed("unknown", RETRY_OR_SUPPORT);
}

export function classifySignupException(
  error: unknown,
): Extract<SignupOutcome, { status: "failed" }> {
  if (isSignupAuthError(error)) return classifySignupError(error);
  return failed("unknown", RETRY_OR_SUPPORT);
}

export function logSignupFailure(
  failure: Extract<SignupOutcome, { status: "failed" }>,
  error?: unknown,
) {
  const authError = isSignupAuthError(error) ? error : null;
  // Never log the submitted email, password, metadata, tokens, or provider message.
  console.error("[auth] Email signup was not accepted for confirmation delivery", {
    category: failure.category,
    code: authError?.code ?? "no_auth_error_code",
    name: authError?.name ?? "SignupResultError",
    status: authError?.status ?? null,
  });
}

function classifySignupError(error: SignupAuthError): Extract<SignupOutcome, { status: "failed" }> {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return failed(
        "rate-limit",
        "Too many verification emails were requested. Please wait a few minutes and try again.",
      );
    case "email_address_not_authorized":
      return failed(
        "delivery-provider",
        "We couldn't send a verification email to this address. Please contact BLACKPIPS support.",
      );
    case "signup_disabled":
    case "email_provider_disabled":
      return failed(
        "signup-disabled",
        "Email account creation is temporarily unavailable. Please try again later or contact support.",
      );
    case "email_exists":
    case "user_already_exists":
      return failed(
        "already-registered",
        "This email may already have a BLACKPIPS account. Try signing in or resetting your password.",
      );
    case "email_address_invalid":
      return failed("invalid-email", "Enter a valid email address and try again.");
    default:
      if (error.status === 429) {
        return failed(
          "rate-limit",
          "Too many verification emails were requested. Please wait a few minutes and try again.",
        );
      }
      if (typeof error.status === "number" && error.status >= 500) {
        return failed(
          "delivery-provider",
          "The verification email service is temporarily unavailable. Please try again shortly.",
        );
      }
      return failed("unknown", RETRY_OR_SUPPORT);
  }
}

function failed(
  category: Extract<SignupOutcome, { status: "failed" }>["category"],
  message: string,
): Extract<SignupOutcome, { status: "failed" }> {
  return { status: "failed", category, message };
}

function isSignupAuthError(error: unknown): error is SignupAuthError {
  return Boolean(error && typeof error === "object");
}
