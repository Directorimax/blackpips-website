import { useState, type ReactNode } from "react";

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

export function AppStoreBadge() {
  return (
    <a
      className="store-badge"
      href="https://apps.apple.com/tz/app/blackpips/id6821567324"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download on the App Store"
    >
      <AppleLogo />
      <span className="store-badge-text">
        <small>Download on the</small>App Store
      </span>
    </a>
  );
}

export function OpenAppButton({
  className = "btn btn-gold",
  children = "Continue in BLACKPIPS App",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);

  function showAppOptions() {
    const { userAgent, maxTouchPoints } = navigator;
    if (/Android/i.test(userAgent)) setPlatform("android");
    else if (
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
    )
      setPlatform("ios");
    else setPlatform("desktop");
  }

  return (
    <div>
      <button
        type="button"
        className={className}
        aria-expanded={platform !== null}
        onClick={() => (platform ? setPlatform(null) : showAppOptions())}
      >
        {children}
      </button>
      {platform && (
        <div>
          <p className="small">
            Open BLACKPIPS on your device and sign in with the account you used to purchase. If you
            need the app, download it below.
          </p>
          <div className="store-badges">
            {platform !== "android" && <AppStoreBadge />}
            {platform !== "ios" && <GooglePlayBadge />}
          </div>
        </div>
      )}
    </div>
  );
}
