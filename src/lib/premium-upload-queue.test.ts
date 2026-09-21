import { describe, expect, it } from "vitest";
import {
  PREMIUM_UPLOAD_CONCURRENCY,
  canEditQueuedMetadata,
  nextQueuedItems,
  titleFromVideoFilename,
  type PremiumUploadQueueItem,
} from "./premium-upload-queue";

const item = (id: string, status: PremiumUploadQueueItem["status"]): PremiumUploadQueueItem => ({
  id,
  file: new File(["video"], `${id}.mp4`, { type: "video/mp4" }),
  title: id,
  description: "",
  position: "",
  phaseNumber: 1,
  status,
  progress: 0,
  error: "",
  lessonId: null,
});

describe("Premium multi-upload queue", () => {
  it.each([
    [1, ["1"]],
    [2, ["1", "2"]],
    [5, ["1", "2"]],
  ])("starts a bounded batch of %i selected videos", (count, expected) => {
    const items = Array.from({ length: count as number }, (_, index) =>
      item(String(index + 1), "queued"),
    );
    expect(nextQueuedItems(items, 0).map(({ id }) => id)).toEqual(expected);
  });

  it("limits concurrent work and advances queued files independently", () => {
    const items = Array.from({ length: 5 }, (_, index) => item(String(index + 1), "queued"));
    expect(PREMIUM_UPLOAD_CONCURRENCY).toBe(2);
    expect(nextQueuedItems(items, 0).map(({ id }) => id)).toEqual(["1", "2"]);
    items[0].status = "completed";
    items[1].status = "uploading";
    expect(nextQueuedItems(items, 1).map(({ id }) => id)).toEqual(["3"]);
  });

  it("allows failed items to be edited/retried without touching completed items", () => {
    expect(canEditQueuedMetadata("failed")).toBe(true);
    expect(canEditQueuedMetadata("completed")).toBe(false);
    expect(nextQueuedItems([item("failed", "failed"), item("next", "queued")], 0)).toHaveLength(1);
  });

  it("never schedules a queued item after it is removed", () => {
    const items = [
      item("active", "uploading"),
      item("remove-me", "queued"),
      item("next", "queued"),
    ];
    const remaining = items.filter((candidate) => candidate.id !== "remove-me");
    expect(nextQueuedItems(remaining, 1).map(({ id }) => id)).toEqual(["next"]);
  });

  it("derives an editable title without changing the source File", () => {
    expect(titleFromVideoFilename("03_market-structure.mp4")).toBe("03 market structure");
  });
});
