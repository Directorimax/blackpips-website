import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lessonsSource = readFileSync(new URL("../routes/admin/lessons.tsx", import.meta.url), "utf8");
const alcSource = readFileSync(new URL("../routes/admin/alc-library.tsx", import.meta.url), "utf8");
const tipsSource = readFileSync(
  new URL("../routes/admin/trading-tips.tsx", import.meta.url),
  "utf8",
);

describe("admin lesson learning areas", () => {
  it("presents the three real learning areas without merging their data contracts", () => {
    expect(lessonsSource).toContain('"Premium Lessons"');
    expect(lessonsSource).toContain('"Free Lessons"');
    expect(lessonsSource).toContain('"ALC Access"');
    expect(lessonsSource).toContain("<AdminAlcLibrary embedded />");
    expect(lessonsSource).toContain("FREE_LESSONS.map");
  });

  it("makes device upload the default premium lesson workflow and exposes save-first guidance", () => {
    expect(lessonsSource).toContain('mediaSource: "self_hosted"');
    expect(lessonsSource).toContain("Upload lesson video from device");
    expect(lessonsSource).toContain("Save the lesson details to activate MP4 upload");
    expect(lessonsSource).toContain("Drag and drop or select media");
  });

  it("reuses the shared dropzone without adding lesson expiry to either admin library", () => {
    expect(lessonsSource).toContain("<MediaDropzone");
    expect(tipsSource).toContain("<MediaDropzone");
    expect(alcSource).not.toContain("ExpiryPicker");
    expect(lessonsSource).not.toContain("ExpiryPicker");
  });
});
