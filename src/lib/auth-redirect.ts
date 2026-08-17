export const DEFAULT_AUTH_DESTINATION = "/dashboard";
export const AUTH_REDIRECT_KEY = "blackpips:auth-redirect";
export const AUTH_REDIRECT_COOKIE = "blackpips-auth-redirect";
export const CANONICAL_PRODUCTION_ORIGIN = "https://www.blackpips.com";

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
    document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safeDestination)}; Path=/; Max-Age=86400; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  }
}

export function consumeAuthRedirect() {
  if (typeof window === "undefined") return null;
  const destination = getSafeRedirect(window.sessionStorage.getItem(AUTH_REDIRECT_KEY));
  window.sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  return destination;
}

export function getAuthCallbackUrl(location: Pick<Location, "origin" | "hostname">) {
  const origin = getAuthOrigin(location);
  return new URL("/auth/callback", origin).toString();
}

export function getEmailConfirmationUrl(location: Pick<Location, "origin" | "hostname">) {
  return new URL("/auth/confirm", getAuthOrigin(location)).toString();
}

function getAuthOrigin(location: Pick<Location, "origin" | "hostname">) {
  return location.hostname === "blackpips.com" || location.hostname === "www.blackpips.com"
    ? CANONICAL_PRODUCTION_ORIGIN
    : location.origin;
}
