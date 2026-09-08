import { supabase } from "@/integrations/supabase/client";

export type MediaFaststartTargetKind = "alc_video" | "lesson";
export type MediaFaststartState = "queued" | "processing" | "ready" | "failed";

export type MediaFaststartStatus = {
  jobId: string;
  state: MediaFaststartState;
  lastError: string | null;
};

export const MEDIA_FASTSTART_POLL_INTERVAL_MS = 2_000;
export const MEDIA_FASTSTART_MAX_POLLS = 150;

type StatusRow = {
  job_id?: string | null;
  status?: string | null;
  state?: string | null;
  last_error?: string | null;
};

function firstRow(value: unknown): StatusRow | null {
  if (Array.isArray(value)) return (value[0] as StatusRow | undefined) ?? null;
  return value && typeof value === "object" ? (value as StatusRow) : null;
}

export async function getMediaFaststartStatus(
  targetKind: MediaFaststartTargetKind,
  targetId: string,
): Promise<MediaFaststartStatus | null> {
  const { data, error } = await supabase.rpc("admin_get_media_faststart_status", {
    p_target_kind: targetKind,
    p_target_id: targetId,
  });
  if (error) throw new Error(error.message);
  const row = firstRow(data);
  const state = row?.status ?? row?.state;
  if (!row?.job_id || !["queued", "processing", "ready", "failed"].includes(state ?? "")) {
    return null;
  }
  return {
    jobId: row.job_id,
    state: state as MediaFaststartState,
    lastError: row.last_error ?? null,
  };
}

export async function retryMediaFaststartJob(jobId: string) {
  const { error } = await supabase.rpc("admin_retry_media_faststart_job", {
    p_job_id: jobId,
  });
  if (error) throw new Error(error.message);
}

export async function waitForMediaFaststart(options: {
  targetKind: MediaFaststartTargetKind;
  targetId: string;
  signal?: AbortSignal;
  onStatus?: (status: MediaFaststartStatus | null) => void;
  intervalMs?: number;
  maxPolls?: number;
}) {
  const intervalMs = options.intervalMs ?? MEDIA_FASTSTART_POLL_INTERVAL_MS;
  const maxPolls = options.maxPolls ?? MEDIA_FASTSTART_MAX_POLLS;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    if (options.signal?.aborted) throw new DOMException("Polling aborted", "AbortError");
    const status = await getMediaFaststartStatus(options.targetKind, options.targetId);
    options.onStatus?.(status);
    if (!status || status.state === "ready" || status.state === "failed") return status;
    await new Promise<void>((resolve, reject) => {
      const timeout = globalThis.setTimeout(resolve, intervalMs);
      options.signal?.addEventListener(
        "abort",
        () => {
          globalThis.clearTimeout(timeout);
          reject(new DOMException("Polling aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
  throw new Error(
    "Video processing is taking longer than expected. Check its status again shortly.",
  );
}
