import { describe, expect, it } from "vitest";
import {
  COURSE_MEDIA_MAX_BYTES,
  coursePosterPath,
  courseVideoPath,
  formatBytes,
  resumableEndpoint,
  validateCourseVideo,
  validatePoster,
} from "./admin-course-media";

function file(details: Partial<File> & Pick<File, "name" | "type" | "size">) {
  return details as File;
}

describe("admin course media contract", () => {
  it("builds canonical private object paths", () => {
    expect(courseVideoPath("course-id", "lesson-id")).toBe("course-id/lesson-id/video.mp4");
    expect(coursePosterPath("course-id", "lesson-id")).toBe("course-id/lesson-id/poster.webp");
  });

  it("accepts MP4 and rejects renamed or oversized uploads", () => {
    expect(
      validateCourseVideo(file({ name: "lesson.mp4", type: "video/mp4", size: 42 })),
    ).toBeNull();
    expect(
      validateCourseVideo(file({ name: "lesson.mov", type: "video/quicktime", size: 42 })),
    ).toMatch(/MP4/);
    expect(
      validateCourseVideo(file({ name: "lesson.mp4", type: "video/quicktime", size: 42 })),
    ).toMatch(/MP4/);
    expect(
      validateCourseVideo(
        file({ name: "lesson.mp4", type: "video/mp4", size: COURSE_MEDIA_MAX_BYTES + 1 }),
      ),
    ).toMatch(/3 GiB/);
  });

  it("accepts only WebP and JPEG posters", () => {
    expect(validatePoster(file({ name: "poster.webp", type: "image/webp", size: 42 }))).toBeNull();
    expect(validatePoster(file({ name: "poster.jpg", type: "image/jpeg", size: 42 }))).toBeNull();
    expect(validatePoster(file({ name: "poster.png", type: "image/png", size: 42 }))).toMatch(
      /WebP or JPEG/,
    );
  });

  it("uses the self-hosted TUS endpoint and readable byte values", () => {
    expect(resumableEndpoint("https://supabase.blackpips.com")).toBe(
      "https://supabase.blackpips.com/storage/v1/upload/resumable",
    );
    expect(formatBytes(6 * 1024 * 1024)).toBe("6.00 MB");
  });
});
