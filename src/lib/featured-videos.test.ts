import { describe, expect, it } from "vitest";
import { featuredVideoThumbnail, normalizeYouTubeVideoId } from "./featured-videos";

describe("featured video YouTube normalization", () => {
  const id = "dQw4w9WgXcQ";

  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}&feature=share`,
    `https://youtu.be/${id}?si=test`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ])("normalizes %s", (input) => expect(normalizeYouTubeVideoId(input)).toBe(id));

  it.each([
    "",
    "not-a-valid-id",
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/playlist?list=abc",
    "https://youtube.com/watch?v=too-short",
  ])("rejects %s", (input) => expect(normalizeYouTubeVideoId(input)).toBeNull());

  it("builds the public YouTube thumbnail from the canonical ID", () => {
    expect(featuredVideoThumbnail(id)).toBe(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
  });
});
