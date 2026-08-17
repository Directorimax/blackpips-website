import { DEFAULT_AUTH_DESTINATION, getSafeRedirect } from "./auth-redirect";

export type AuthExchangeResult = {
  error: { code?: string; message?: string } | null;
  redirectType?: string | null;
  userId?: string | null;
};

type CallbackDependencies = {
  exchangeCode: (code: string, flowId: string | null) => Promise<AuthExchangeResult>;
  intendedDestination?: string | null;
  authenticatedReplay?: boolean;
  afterExchange?: (userId: string) => Promise<void>;
};

function redirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Location: location,
    },
  });
}

export function createRecoveryLocation(destination: string) {
  const params = new URLSearchParams({ status: "recovery" });
  const safeDestination = getSafeRedirect(destination);
  if (safeDestination) params.set("redirect", safeDestination);
  return `/auth/callback?${params.toString()}`;
}

/**
 * Processes only callback URLs that contain a provider response. Returning null
 * lets the normal callback recovery page render for direct visits.
 */
export async function processAuthCallbackRequest(
  request: Request,
  dependencies: CallbackDependencies,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/auth/callback") return null;

  const requestedDestination =
    getSafeRedirect(url.searchParams.get("redirect")) ??
    getSafeRedirect(dependencies.intendedDestination) ??
    DEFAULT_AUTH_DESTINATION;
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (providerError) return redirect(createRecoveryLocation(requestedDestination));
  if (!code) return null;
  if (dependencies.authenticatedReplay) return redirect(requestedDestination);

  const result = await dependencies.exchangeCode(code, url.searchParams.get("sb_flow_id"));
  if (result.error) return redirect(createRecoveryLocation(requestedDestination));

  if (result.userId && dependencies.afterExchange) {
    await dependencies.afterExchange(result.userId);
  }

  const destination = result.redirectType === "recovery" ? "/reset-password" : requestedDestination;
  return redirect(destination);
}
