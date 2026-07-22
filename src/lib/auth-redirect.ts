export const DEFAULT_AUTH_DESTINATION = "/dashboard";
export const AUTH_REDIRECT_KEY = "blackpips:auth-redirect";

export function getSafeRedirect(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, "https://blackpips.internal");
    if (parsed.origin !== "https://blackpips.internal") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function rememberAuthRedirect(destination: string) {
  const safeDestination = getSafeRedirect(destination);
  if (safeDestination && typeof window !== "undefined") {
    window.sessionStorage.setItem(AUTH_REDIRECT_KEY, safeDestination);
  }
}

export function consumeAuthRedirect() {
  if (typeof window === "undefined") return null;
  const destination = getSafeRedirect(window.sessionStorage.getItem(AUTH_REDIRECT_KEY));
  window.sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  return destination;
}
