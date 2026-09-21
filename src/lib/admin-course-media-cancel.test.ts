import { beforeEach, describe, expect, it, vi } from "vitest";

const tus = vi.hoisted(() => ({
  abort: vi.fn(async (_removeFingerprint: boolean) => undefined),
  start: vi.fn(),
  options: null as Record<string, ((...args: never[]) => void) | undefined> | null,
}));

vi.mock("tus-js-client", () => ({
  Upload: class {
    options: Record<string, ((...args: never[]) => void) | undefined>;
    constructor(_file: File, options: Record<string, ((...args: never[]) => void) | undefined>) {
      this.options = options;
      tus.options = options;
    }
    findPreviousUploads() {
      return Promise.resolve([]);
    }
    resumeFromPreviousUpload() {}
    start() {
      tus.start();
    }
    abort(removeFingerprint: boolean) {
      return tus.abort(removeFingerprint);
    }
  },
}));

import {
  MediaUploadCancelledError,
  startResumableMediaUpload,
  type UploadProgress,
} from "./admin-course-media";

describe("resumable media cancellation", () => {
  beforeEach(() => {
    tus.abort.mockClear();
    tus.start.mockClear();
    tus.options = null;
  });

  it("terminates TUS, settles completion and suppresses stale callbacks", async () => {
    const progress: UploadProgress[] = [];
    const task = startResumableMediaUpload({
      file: new File(["video"], "lesson.mp4", { type: "video/mp4" }),
      endpoint: "https://storage.example/upload/resumable",
      accessToken: "test-token",
      publishableKey: "test-key",
      objectPath: "course/lesson/video.mp4",
      upsert: false,
      onProgress: (value) => progress.push(value),
    });
    tus.options?.onProgress?.(5 as never, 10 as never);
    expect(progress).toHaveLength(1);

    const completion = expect(task.completion).rejects.toBeInstanceOf(MediaUploadCancelledError);
    await task.cancel();
    await completion;
    expect(tus.abort).toHaveBeenCalledWith(true);

    tus.options?.onProgress?.(10 as never, 10 as never);
    tus.options?.onSuccess?.();
    expect(progress).toHaveLength(1);
  });
});
