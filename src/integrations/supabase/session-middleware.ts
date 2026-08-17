import { createMiddleware } from "@tanstack/react-start";
import { deleteCookie, getCookie, getCookies, getRequest } from "@tanstack/react-start/server";

import { processAuthCallbackRequest } from "@/lib/auth-callback";
import { AUTH_REDIRECT_COOKIE, getSafeRedirect } from "@/lib/auth-redirect";
import { createSupabaseServerClient } from "./server";

export const supabaseSessionMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  if (!request) return next();

  const requestUrl = new URL(request.url);
  const cookies = getCookies();
  const cookieNames = Object.keys(cookies);
  const callbackFlowId = requestUrl.searchParams.get("sb_flow_id");
  const hasCallbackVerifier = callbackFlowId
    ? cookieNames.some((name) => name.includes(`-flow-${callbackFlowId}-code-verifier`))
    : cookieNames.some((name) => name.includes("code-verifier"));
  const hasSessionCookie = cookieNames.some(
    (name) =>
      name.startsWith("sb-") && name.includes("-auth-token") && !name.includes("code-verifier"),
  );
  let authenticatedReplay = false;

  if (
    requestUrl.pathname === "/auth/callback" &&
    requestUrl.searchParams.has("code") &&
    !hasCallbackVerifier &&
    hasSessionCookie
  ) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    authenticatedReplay = !error && Boolean(data?.claims?.sub);
  }

  const intendedDestination = getSafeRedirect(getCookie(AUTH_REDIRECT_COOKIE));
  const callbackResponse = await processAuthCallbackRequest(request, {
    intendedDestination,
    authenticatedReplay,
    exchangeCode: async (code, flowId) => {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );

      if (error) {
        console.warn("[auth] Server callback exchange failed", {
          code: error.code,
          name: error.name,
        });
      }

      return {
        error,
        redirectType:
          "redirectType" in data && typeof data.redirectType === "string"
            ? data.redirectType
            : null,
        userId: data.user?.id,
      };
    },
    afterExchange: async (userId) => {
      try {
        const { sendNotification } = await import("@/services/email/email.service.server");
        await sendNotification({ type: "welcome", resourceId: userId, actorId: userId });
      } catch (error) {
        console.error("[auth] Welcome notification request failed", error);
      }
    },
  });

  if (callbackResponse) {
    deleteCookie(AUTH_REDIRECT_COOKIE, { path: "/" });
    return callbackResponse;
  }

  // Let the SSR helper refresh an existing cookie session before rendering.
  if (hasSessionCookie) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.getClaims();
  }

  return next();
});
