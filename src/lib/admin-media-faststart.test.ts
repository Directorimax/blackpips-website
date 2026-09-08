import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import { ADMIN_VIDEO_TUS_CHUNK_BYTES, startResumableMediaUpload } from "./admin-course-media";
import {
  getMediaFaststartStatus,
  MEDIA_FASTSTART_POLL_INTERVAL_MS,
  retryMediaFaststartJob,
  waitForMediaFaststart,
} from "./admin-media-faststart";

describe("Admin media fast-start processing", () => {
  beforeEach(() => rpc.mockReset());

  it("normalizes the deployed status response", async () => {
    rpc.mockResolvedValue({
      data: [{ job_id: "job-1", status: "processing", last_error: null }],
      error: null,
    });
    await expect(getMediaFaststartStatus("lesson", "lesson-1")).resolves.toEqual({
      jobId: "job-1",
      state: "processing",
      lastError: null,
    });
    expect(rpc).toHaveBeenCalledWith("admin_get_media_faststart_status", {
      p_target_kind: "lesson",
      p_target_id: "lesson-1",
    });
  });

  it("polls queued and processing jobs until ready, then stops", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [{ job_id: "job-1", status: "queued", last_error: null }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ job_id: "job-1", status: "processing", last_error: null }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ job_id: "job-1", status: "ready", last_error: null }],
        error: null,
      });
    const states: Array<string | undefined> = [];
    const result = await waitForMediaFaststart({
      targetKind: "alc_video",
      targetId: "video-1",
      intervalMs: 0,
      onStatus: (status) => states.push(status?.state),
    });
    expect(states).toEqual(["queued", "processing", "ready"]);
    expect(result?.state).toBe("ready");
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("stops on failure and preserves the safe backend error", async () => {
    rpc.mockResolvedValue({
      data: [{ job_id: "job-2", status: "failed", last_error: "Remux failed" }],
      error: null,
    });
    await expect(
      waitForMediaFaststart({ targetKind: "lesson", targetId: "lesson-2", intervalMs: 0 }),
    ).resolves.toMatchObject({ state: "failed", lastError: "Remux failed" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("retries by job identity through the checked Admin RPC", async () => {
    rpc.mockResolvedValue({ data: undefined, error: null });
    await retryMediaFaststartJob("job-3");
    expect(rpc).toHaveBeenCalledWith("admin_retry_media_faststart_job", { p_job_id: "job-3" });
  });

  it("keeps the shared 20 MiB resumable uploader configuration", () => {
    expect(ADMIN_VIDEO_TUS_CHUNK_BYTES).toBe(20_971_520);
    expect(MEDIA_FASTSTART_POLL_INTERVAL_MS).toBe(2_000);
    expect(startResumableMediaUpload).toBeTypeOf("function");
  });
});
