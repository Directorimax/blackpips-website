import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TradingTipMedia } from "@/lib/trading-tips";
import { getTradingTipMediaUrl } from "@/services/trading-tips/trading-tips.functions";

export type ResolvedTipImage = { media: TradingTipMedia; url: string };
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const glassControl =
  "border border-white/15 bg-black/20 text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-md transition duration-150 hover:border-gold/45 hover:bg-black/40 hover:text-gold focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";

export function SecureTipVideo({ src, className }: { src: string; className?: string }) {
  const [unsupported, setUnsupported] = useState(false);
  return (
    <div
      className={`relative overflow-hidden bg-black ${className ?? ""}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        className="aspect-video h-auto max-h-[80vh] w-full object-contain"
        controls
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        preload="metadata"
        src={src}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onError={() => setUnsupported(true)}
      >
        Your browser does not support in-app video playback.
      </video>
      {unsupported && (
        <p className="absolute inset-x-3 bottom-14 rounded-lg bg-black/80 p-3 text-center text-xs text-white">
          This video codec is not supported by your browser. Try Safari for iPhone MOV videos.
        </p>
      )}
    </div>
  );
}

function SignedMedia({
  tipId,
  media,
  alt,
  onReady,
  onPreview,
  priority,
}: {
  tipId: string;
  media: TradingTipMedia;
  alt: string;
  onReady: (item: ResolvedTipImage) => void;
  onPreview: () => void;
  priority: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const cached = signedUrlCache.get(media.id);
      if (cached && cached.expiresAt > Date.now()) {
        if (alive) {
          setUrl(cached.url);
          onReady({ media, url: cached.url });
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const result = await getTradingTipMediaUrl({
          data: { tipId, mediaId: media.id },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (alive) {
          signedUrlCache.set(media.id, { url: result.signedUrl, expiresAt: Date.now() + 50_000 });
          setUrl(result.signedUrl);
          onReady({ media, url: result.signedUrl });
        }
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tipId, media, onReady]);
  if (failed)
    return (
      <div className="grid aspect-[4/3] place-items-center bg-muted text-sm text-muted-foreground">
        Media is unavailable.
      </div>
    );
  if (!url)
    return (
      <div className="grid aspect-[4/3] place-items-center bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  if (media.media_type === "video")
    return <SecureTipVideo className="aspect-[4/3] w-full" src={url} />;
  return (
    <button
      type="button"
      className="group relative block w-full cursor-zoom-in overflow-hidden"
      aria-label={`Preview ${alt}`}
      onClick={onPreview}
    >
      <span className="relative block aspect-[4/3] w-full bg-muted/80">
        {!loaded && (
          <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-gold/5 to-muted" />
        )}
        <img
          className={`absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-[1.025] ${loaded ? "opacity-100" : "opacity-0"}`}
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
        />
      </span>
    </button>
  );
}

export const TradingTipLightbox = memo(function TradingTipLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: ResolvedTipImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const startX = useRef<number | null>(null);
  const images = items.filter(({ media }) => media.media_type === "image");
  const current = images[index] ?? images[0];
  const multiple = images.length > 1;
  const previous = useCallback(
    () => onIndexChange((index - 1 + images.length) % images.length),
    [index, images.length, onIndexChange],
  );
  const next = useCallback(
    () => onIndexChange((index + 1) % images.length),
    [index, images.length, onIndexChange],
  );
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (multiple && event.key === "ArrowLeft") previous();
      if (multiple && event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
    };
  }, [multiple, next, onClose, previous]);
  useLayoutEffect(() => {
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);
  if (!current) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 opacity-100 backdrop-blur-sm transition-opacity duration-200 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      onTouchStart={(e) => {
        startX.current = e.changedTouches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (!multiple || startX.current === null) return;
        const delta = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(delta) > 45) {
          if (delta > 0) previous();
          else next();
        }
        startX.current = null;
      }}
    >
      <div className="flex h-[90vh] w-[95vw] items-center justify-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close image preview"
          className={`absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full ${glassControl} sm:right-7 sm:top-7 sm:h-10 sm:w-10`}
        >
          <X className="h-5 w-5" />
        </button>
        {multiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                previous();
              }}
              aria-label="Previous image"
              className={`absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full opacity-50 ${glassControl} sm:left-7 sm:grid sm:h-10 sm:w-10 sm:hover:opacity-100`}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
              className={`absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full opacity-50 ${glassControl} sm:right-7 sm:grid sm:h-10 sm:w-10 sm:hover:opacity-100`}
            >
              <ChevronRight />
            </button>
          </>
        )}
        <img
          src={current.url}
          alt="Full-size trading chart"
          className="h-auto max-h-[90vh] w-auto max-w-[95vw] select-none object-contain shadow-2xl transition-[opacity,transform] duration-200"
          onClick={(event) => event.stopPropagation()}
        />
        {multiple && (
          <div
            className={`absolute bottom-5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${glassControl}`}
            onClick={(event) => event.stopPropagation()}
          >
            {index + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
});

export function TipMedia({
  tipId,
  media,
  alt,
  onPreview,
  priority = false,
}: {
  tipId: string;
  media: TradingTipMedia[];
  alt: string;
  onPreview?: (images: ResolvedTipImage[], index: number) => void;
  priority?: boolean;
}) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState(0);
  const [resolved, setResolved] = useState<Record<string, ResolvedTipImage>>({});
  const multi = media.length > 1;
  const imageItems = media
    .filter((item) => item.media_type === "image")
    .map((item) => resolved[item.id])
    .filter(Boolean) as ResolvedTipImage[];
  const register = useCallback(
    (item: ResolvedTipImage) =>
      setResolved((current) =>
        current[item.media.id]?.url === item.url ? current : { ...current, [item.media.id]: item },
      ),
    [],
  );
  useEffect(() => {
    if (!embla) return;
    const update = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", update);
    update();
    return () => {
      embla.off("select", update);
    };
  }, [embla]);
  const previous = useCallback(() => embla?.scrollPrev(), [embla]);
  const next = useCallback(() => embla?.scrollNext(), [embla]);
  if (!media.length)
    return (
      <div className="grid aspect-[4/3] place-items-center bg-muted text-sm text-muted-foreground">
        Media is unavailable.
      </div>
    );
  const gallery = (
    <>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {media.map((item, index) => (
            <div className="min-w-0 flex-[0_0_100%]" key={item.id}>
              <SignedMedia
                tipId={tipId}
                media={item}
                alt={`${alt}${multi ? `, item ${index + 1}` : ""}`}
                onReady={register}
                priority={priority && index === 0}
                onPreview={() => {
                  const imageIndex = imageItems.findIndex(
                    ({ media: image }) => image.id === item.id,
                  );
                  if (imageIndex >= 0) onPreview?.(imageItems, imageIndex);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
  return (
    <>
      <section
        className="relative overflow-hidden bg-black"
        aria-label={`${media.length} item media gallery`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") previous();
          if (event.key === "ArrowRight") next();
        }}
      >
        {gallery}
        {multi && (
          <>
            <button
              type="button"
              aria-label="Previous media item"
              onClick={previous}
              className={`absolute left-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full opacity-45 ${glassControl} sm:left-3 sm:hover:opacity-100`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next media item"
              onClick={next}
              className={`absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full opacity-45 ${glassControl} sm:right-3 sm:hover:opacity-100`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div
              className={`absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${glassControl}`}
            >
              <span>
                {selected + 1} / {media.length}
              </span>
            </div>
          </>
        )}
      </section>
    </>
  );
}
