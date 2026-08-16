import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Minus, Plus, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createSeoHead } from "@/lib/seo";
import { WELCOME_GIFT } from "@/lib/welcome-gift";
import { getWelcomeGiftPdfUrl } from "@/services/welcome-gift/welcome-gift.functions";

export const Route = createFileRoute("/_authenticated/dashboard/gift/$giftId")({
  head: () =>
    createSeoHead({
      title: "BLACKPIPS Starter Guide",
      description: "Read your claimed BLACKPIPS Starter Guide.",
      path: `/dashboard/gift/${WELCOME_GIFT.id}`,
      noindex: true,
    }),
  component: WelcomeGiftPdfViewer,
});

function WelcomeGiftPdfViewer() {
  const { giftId } = Route.useParams();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const loadPdf = useCallback(async () => {
    if (giftId !== WELCOME_GIFT.id) {
      setError("This Welcome Gift is not available.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [{ signedUrl }, pdfjs] = await Promise.all([
        getWelcomeGiftPdfUrl(),
        import("pdfjs-dist"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const document = await pdfjs.getDocument({ url: signedUrl }).promise;
      setPdf(document);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open the Starter Guide.");
    } finally {
      setLoading(false);
    }
  }, [giftId]);

  useEffect(() => {
    void loadPdf();
  }, [loadPdf]);

  useEffect(() => {
    return () => {
      void pdf?.destroy();
    };
  }, [pdf]);

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-muted/30">
      <header className="sticky top-20 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2.5 sm:px-5">
          <Link
            to="/dashboard"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold hover:bg-muted"
          >
            <ArrowLeft className="size-4" />{" "}
            <span className="hidden min-[390px]:inline">Dashboard</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-sm font-bold sm:text-base">
              {WELCOME_GIFT.pdf.title}
            </h1>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              {pdf ? `Page ${currentPage} of ${pdf.numPages}` : "BLACKPIPS Welcome Gift"}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
              disabled={!pdf || zoom <= 0.75}
              aria-label="Zoom out"
              className="grid size-9 place-items-center rounded-full hover:bg-muted disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              disabled={!pdf}
              aria-label="Fit to width"
              className="hidden min-h-9 items-center gap-1 rounded-full px-2 text-[10px] font-bold hover:bg-muted sm:inline-flex"
            >
              <ScanLine className="size-3.5" /> Fit
            </button>
            <span className="min-w-9 text-center text-[10px] font-bold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
              disabled={!pdf || zoom >= 2}
              aria-label="Zoom in"
              className="grid size-9 place-items-center rounded-full hover:bg-muted disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-2 py-4 sm:px-5 sm:py-6">
        {loading && (
          <div className="grid min-h-[55vh] place-items-center rounded-3xl border border-border bg-card">
            <div className="text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-gold" />
              <p className="mt-3 text-sm font-semibold">Preparing your Starter Guide…</p>
              <p className="mt-1 text-xs text-muted-foreground">Loading pages securely</p>
            </div>
          </div>
        )}
        {error && (
          <div className="mx-auto max-w-lg rounded-3xl border border-destructive/25 bg-card p-8 text-center shadow-elegant">
            <h2 className="font-display text-xl font-bold">Unable to open the guide</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void loadPdf()}
              className="mt-5 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        )}
        {pdf && <PdfPages pdf={pdf} zoom={zoom} onCurrentPageChange={setCurrentPage} />}
      </main>
    </div>
  );
}

function PdfPages({
  pdf,
  zoom,
  onCurrentPageChange,
}: {
  pdf: PDFDocumentProxy;
  zoom: number;
  onCurrentPageChange: (page: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const page = Number((visible?.target as HTMLElement | undefined)?.dataset.pdfPage);
        if (page) onCurrentPageChange(page);
      },
      { rootMargin: "-20% 0px -55%", threshold: [0, 0.25, 0.5, 0.75] },
    );
    root.querySelectorAll("[data-pdf-page]").forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [onCurrentPageChange, pdf.numPages]);

  return (
    <div
      ref={containerRef}
      className="select-none space-y-4 sm:space-y-6"
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "pan-x pan-y pinch-zoom",
      }}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      role="document"
      aria-label="Protected PDF pages"
    >
      {Array.from({ length: pdf.numPages }, (_, index) => (
        <PdfPage key={index + 1} pdf={pdf} pageNumber={index + 1} zoom={zoom} />
      ))}
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  zoom,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [width, setWidth] = useState(1);

  useEffect(() => {
    let active = true;
    void pdf.getPage(pageNumber).then((loadedPage) => {
      if (active) setPage(loadedPage);
    });
    return () => {
      active = false;
    };
  }, [pageNumber, pdf]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => setWidth(Math.max(1, wrapper.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    const unscaled = page.getViewport({ scale: 1 });
    const cssScale = (width / unscaled.width) * zoom;
    const viewport = page.getViewport({ scale: cssScale });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    const task = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
    });
    return () => task.cancel();
  }, [page, width, zoom]);

  return (
    <div
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      className="mx-auto flex min-h-48 w-full justify-center overflow-x-auto rounded-lg bg-muted/50 shadow-elegant sm:rounded-xl"
    >
      {!page && <Loader2 className="my-20 size-5 animate-spin text-gold" />}
      <canvas
        ref={canvasRef}
        draggable={false}
        className="block max-w-none bg-white"
        style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
        aria-label={`Page ${pageNumber}`}
      />
    </div>
  );
}
