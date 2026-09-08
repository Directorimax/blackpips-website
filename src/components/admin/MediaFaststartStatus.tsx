import { Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  retryMediaFaststartJob,
  type MediaFaststartStatus as FaststartStatus,
  type MediaFaststartTargetKind,
  waitForMediaFaststart,
} from "@/lib/admin-media-faststart";

export function MediaFaststartStatus({
  targetKind,
  targetId,
  enabled,
  onReady,
}: {
  targetKind: MediaFaststartTargetKind;
  targetId: string;
  enabled: boolean;
  onReady?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<FaststartStatus | null>(null);
  const [checkError, setCheckError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const readyHandled = useRef(false);
  const sawPending = useRef(false);
  const onReadyRef = useRef(onReady);
  const pollingControllerRef = useRef<AbortController | null>(null);
  onReadyRef.current = onReady;

  const poll = useCallback(
    async (signal?: AbortSignal) => {
      setCheckError("");
      try {
        const result = await waitForMediaFaststart({
          targetKind,
          targetId,
          signal,
          onStatus: (nextStatus) => {
            if (nextStatus?.state === "queued" || nextStatus?.state === "processing") {
              sawPending.current = true;
            }
            setStatus(nextStatus);
          },
        });
        if (result?.state === "ready" && sawPending.current && !readyHandled.current) {
          readyHandled.current = true;
          await onReadyRef.current?.();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCheckError(error instanceof Error ? error.message : "Could not check video processing.");
      }
    },
    [targetId, targetKind],
  );

  useEffect(() => {
    readyHandled.current = false;
    sawPending.current = false;
    setStatus(null);
    setCheckError("");
    if (!enabled) return;
    const controller = new AbortController();
    pollingControllerRef.current = controller;
    void poll(controller.signal);
    return () => {
      controller.abort();
      if (pollingControllerRef.current === controller) pollingControllerRef.current = null;
    };
  }, [enabled, poll]);

  async function retry() {
    if (!status?.jobId || retrying) return;
    setRetrying(true);
    setCheckError("");
    try {
      await retryMediaFaststartJob(status.jobId);
      readyHandled.current = false;
      pollingControllerRef.current?.abort();
      const controller = new AbortController();
      pollingControllerRef.current = controller;
      await poll(controller.signal);
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : "Could not retry video processing.");
    } finally {
      setRetrying(false);
    }
  }

  if (!enabled || (!status && !checkError)) return null;
  return (
    <div
      className="mt-2 rounded-xl border border-border bg-background/50 p-3 text-xs"
      aria-live="polite"
    >
      {status?.state === "queued" && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" /> Upload complete. Preparing video
          for fast playback.
        </p>
      )}
      {status?.state === "processing" && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" /> Optimizing video playback…
        </p>
      )}
      {status?.state === "ready" && <p className="font-semibold text-emerald-600">Video ready</p>}
      {status?.state === "failed" && (
        <div>
          <p className="font-semibold text-destructive">Video processing failed</p>
          {status.lastError && <p className="mt-1 text-destructive">{status.lastError}</p>}
          <button
            type="button"
            disabled={retrying}
            onClick={() => void retry()}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1.5 font-semibold text-gold disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" /> {retrying ? "Retrying…" : "Retry processing"}
          </button>
        </div>
      )}
      {checkError && (
        <div className="text-destructive">
          <p>{checkError}</p>
          <button
            type="button"
            onClick={() => void poll()}
            className="mt-2 font-semibold underline"
          >
            Check status again
          </button>
        </div>
      )}
    </div>
  );
}
