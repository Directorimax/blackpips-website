import { describe, expect, it } from "vitest";
import { MENTORSHIP } from "./site-data";
import { getCurriculumPreview } from "./mentorship-presentation";

describe("mentorship curriculum presentation", () => {
  it("keeps the three programs and uses a compact two-section preview", () => {
    expect(MENTORSHIP).toHaveLength(3);
    for (const program of MENTORSHIP) {
      const preview = getCurriculumPreview(program.modules);
      expect(preview).toHaveLength(2);
      expect(preview.every((module) => module.items.length <= 2)).toBe(true);
    }
  });

  it("does not mutate or discard the full curriculum for expansion", () => {
    const program = MENTORSHIP[0];
    const preview = getCurriculumPreview(program.modules);
    expect(program.modules).toHaveLength(8);
    expect(preview[0].name).toBe(program.modules[0].name);
    expect(preview[0].items).toEqual(program.modules[0].items.slice(0, 2));
  });
});
