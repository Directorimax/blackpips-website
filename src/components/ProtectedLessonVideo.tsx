import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSessionLifecycle } from "@/contexts/session-lifecycle-context";
import { isTrustedYouTubeOrigin, parseYouTubePlaybackState } from "@/lib/youtube-player-state";

type Viewer = {
  fullName: string;
  email: string;
  id: string;
};

const WATERMARK_POSITIONS = [
  "left-5 top-5",
  "right-5 top-5",
  "bottom-5 left-5",
  "bottom-5 right-5",
] as const;

/**
 * Wraps provider embeds in a viewer-specific overlay. This is a deterrent layer:
 * provider-hosted video cannot be made DRM-protected by browser CSS or JavaScript.
 */
export function ProtectedLessonVideo({
  src,
  title,
  viewer,
  onPlaybackChange,
}: {
  src: string;
  title: string;
  viewer: Viewer;
  onPlaybackChange?: (playing: boolean) => void;
}) {
  const playerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const { setLessonVideoPlaying } = useSessionLifecycle();

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        !isTrustedYouTubeOrigin(event.origin)
      )
        return;
      const state = parseYouTubePlaybackState(event.data);
      if (state) {
        const playing = state === "playing";
        setLessonVideoPlaying(playing);
        onPlaybackChange?.(playing);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      setLessonVideoPlaying(false);
      onPlaybackChange?.(false);
    };
  }, [onPlaybackChange, setLessonVideoPlaying]);

  const registerPlaybackEvents = () => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(JSON.stringify({ event: "listening", id: "blackpips-lesson-player" }), "*");
    target.postMessage(
      JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
      "*",
    );
  };

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await playerRef.current?.requestFullscreen();
    } catch {
      // Browsers can deny fullscreen without user activation. Playback remains available inline.
    }
  }

  return (
    <div
      ref={playerRef}
      className="group relative h-full w-full overflow-hidden rounded-2xl bg-black"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")
          event.preventDefault();
      }}
      aria-label={`Protected video player: ${title}`}
    >
      <iframe
        ref={iframeRef}
        title={title}
        src={getProtectedEmbedUrl(src)}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
        onLoad={registerPlaybackEvents}
        onContextMenu={(event) => event.preventDefault()}
      />
      <VideoWatermark viewer={viewer} />
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className="absolute bottom-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white opacity-0 transition hover:bg-black/90 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:opacity-100"
        aria-label={fullscreen ? "Exit fullscreen video" : "View video fullscreen"}
      >
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ProtectedSelfHostedLessonVideo({
  src,
  poster,
  title,
  viewer,
  startPositionSeconds = 0,
  onPlaybackChange,
  onPlaybackError,
}: {
  src: string;
  poster?: string | null;
  title: string;
  viewer: Viewer;
  startPositionSeconds?: number;
  onPlaybackChange?: (playing: boolean) => void;
  onPlaybackError?: () => void;
}) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const initializedRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const { setLessonVideoPlaying } = useSessionLifecycle();

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const resumeAt = initializedRef.current ? video.currentTime : startPositionSeconds;
    const resumePlaying = initializedRef.current && !video.paused;
    video.src = src;
    video.load();
    const restorePlayback = () => {
      if (Number.isFinite(resumeAt) && resumeAt > 0 && resumeAt < video.duration) {
        video.currentTime = resumeAt;
      }
      initializedRef.current = true;
      if (resumePlaying) void video.play().catch(() => undefined);
    };
    video.addEventListener("loadedmetadata", restorePlayback, { once: true });
    return () => video.removeEventListener("loadedmetadata", restorePlayback);
  }, [src, startPositionSeconds]);

  useEffect(
    () => () => {
      setLessonVideoPlaying(false);
      onPlaybackChange?.(false);
    },
    [onPlaybackChange, setLessonVideoPlaying],
  );

  const updatePlaying = (playing: boolean) => {
    setLessonVideoPlaying(playing);
    onPlaybackChange?.(playing);
  };

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await playerRef.current?.requestFullscreen();
    } catch {
      // Playback remains available inline if fullscreen is denied.
    }
  }

  return (
    <div
      ref={playerRef}
      className="group relative h-full w-full overflow-hidden rounded-2xl bg-black"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      aria-label={`Protected video player: ${title}`}
    >
      <video
        ref={videoRef}
        title={title}
        poster={poster ?? undefined}
        className="h-full w-full bg-black object-contain"
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        preload="metadata"
        onPlay={() => updatePlaying(true)}
        onPause={() => updatePlaying(false)}
        onEnded={() => updatePlaying(false)}
        onError={onPlaybackError}
      />
      <VideoWatermark viewer={viewer} />
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white opacity-0 transition hover:bg-black/90 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:opacity-100"
        aria-label={fullscreen ? "Exit fullscreen video" : "View video fullscreen"}
      >
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function VideoWatermark({ viewer }: { viewer: Viewer }) {
  const [positionIndex, setPositionIndex] = useState(0);
  const [timestamp, setTimestamp] = useState(() => new Date());

  useEffect(() => {
    const moveInterval = window.setInterval(() => {
      setPositionIndex((current) => (current + 1) % WATERMARK_POSITIONS.length);
      setTimestamp(new Date());
    }, 24_000);
    const timestampInterval = window.setInterval(() => setTimestamp(new Date()), 1_000);
    return () => {
      window.clearInterval(moveInterval);
      window.clearInterval(timestampInterval);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute z-10 max-w-[calc(100%-2.5rem)] select-none rounded-md border border-white/15 bg-black/35 px-3 py-2 font-mono text-[9px] leading-relaxed tracking-wide text-white/65 shadow-sm transition-all duration-700 sm:text-[10px] ${WATERMARK_POSITIONS[positionIndex]}`}
      aria-hidden="true"
    >
      <div className="font-sans text-[10px] font-bold tracking-[0.18em] text-gold/85">
        BLACKPIPS
      </div>
      <div className="truncate">{viewer.fullName}</div>
      <div className="truncate">{viewer.email}</div>
      <div className="truncate">ID: {viewer.id}</div>
      <div>{timestamp.toLocaleString()}</div>
    </div>
  );
}

function getProtectedEmbedUrl(src: string) {
  const url = new URL(src);
  // The wrapper owns fullscreen so the watermark remains inside the fullscreen element.
  url.searchParams.set("fs", "0");
  url.searchParams.set("enablejsapi", "1");
  if (typeof window !== "undefined") url.searchParams.set("origin", window.location.origin);
  return url.toString();
}
