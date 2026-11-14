import type { ReactNode } from "react";

export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.blackpips.app";

function PlayLogo() {
  return (
    <svg className="store-badge-logo" viewBox="0 0 30 33" aria-hidden="true">
      <path
        d="M1.2.6 16.4 16.5 1.2 32.4C.7 32.1.4 31.5.4 30.8V2.2C.4 1.5.7.9 1.2.6Z"
        fill="#00d7fe"
      />
      <path d="M21.5 11.4 16.4 16.5 1.2.6C1.6.4 2.2.4 2.8.7Z" fill="#00f076" />
      <path d="M21.5 21.6 2.8 32.3C2.2 32.6 1.6 32.6 1.2 32.4L16.4 16.5Z" fill="#ff3a44" />
      <path
        d="M27.6 15 21.5 11.4 16.4 16.5 21.5 21.6 27.6 18C28.8 17.3 28.8 15.7 27.6 15Z"
        fill="#ffd400"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg className="store-badge-logo" viewBox="0 0 26 31" fill="currentColor" aria-hidden="true">
      <path d="M21.6 16.4c0-3.9 3.2-5.8 3.4-5.9-1.8-2.7-4.7-3.1-5.7-3.1-2.4-.2-4.7 1.4-5.9 1.4-1.2 0-3.1-1.4-5.1-1.4C5.7 7.4 3.3 8.9 2 11.2c-2.7 4.7-.7 11.7 1.9 15.5 1.3 1.9 2.8 3.9 4.8 3.9 1.9-.1 2.7-1.2 5-1.2s3 1.2 5 1.2c2.1 0 3.4-1.9 4.6-3.8 1.5-2.2 2.1-4.3 2.1-4.4 0 0-4-1.6-4.1-6.1ZM17.8 4.9c1-1.3 1.8-3.1 1.6-4.9-1.5.1-3.4 1-4.5 2.3-1 1.1-1.8 3-1.6 4.7 1.7.1 3.4-.9 4.5-2.1Z" />
    </svg>
  );
}

/** Live on Google Play: opens the store listing in a new tab. */
export function GooglePlayBadge() {
  return (
    <a
      className="store-badge"
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get it on Google Play"
    >
      <PlayLogo />
      <span className="store-badge-text">
        <small>GET IT ON</small>Google Play
      </span>
    </a>
  );
}

/** Not approved on the App Store yet, so it is shown but not a link. */
export function AppStoreBadge() {
  return (
    <span className="store-badge store-badge-soon" aria-label="App Store, coming soon">
      <AppleLogo />
      <span className="store-badge-text">
        <small>Download on the</small>App Store
      </span>
      <span className="store-badge-tag" aria-hidden="true">
        Coming soon
      </span>
    </span>
  );
}

// The app already handles blackpips://auth-callback, and ignores it when it
// carries no sign-in response, so it is a safe way to just open the app.
const ANDROID_OPEN_APP_URL =
  "intent://auth-callback#Intent;scheme=blackpips;package=com.blackpips.app;" +
  `S.browser_fallback_url=${encodeURIComponent(GOOGLE_PLAY_URL)};end`;

/**
 * On Android it opens the BLACKPIPS app if installed, otherwise Chrome sends the
 * student to Google Play. Elsewhere it opens Google Play, the only live store.
 */
export function OpenAppButton({
  className = "btn btn-gold",
  children = "Continue in BLACKPIPS App",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      className={className}
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (!/Android/i.test(navigator.userAgent)) return;
        event.preventDefault();
        window.location.href = ANDROID_OPEN_APP_URL;
      }}
    >
      {children}
    </a>
  );
}
