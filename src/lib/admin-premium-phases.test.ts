import { describe, expect, it } from "vitest";
import {
  initialPhaseNumber,
  phaseConfigurationByCourse,
  phaseOptions,
  phasePositionLabel,
} from "./admin-premium-phases";

describe("Premium lesson phase configuration", () => {
  const regularId = "3a763af4-45a9-457f-93cb-852fff0a36a5";
  const advancedId = "655a15fd-2bb7-46db-9aab-222f547eccfe";
  const masterclassId = "ee256ca7-6fec-4fc2-83e7-6f1e00da5af0";
  const eightEntriesId = "abd2be17-957e-4f4f-ba31-9dc304a48819";

  const configuration = phaseConfigurationByCourse([
    { course_id: regularId, phase_count: 2 },
    { course_id: advancedId, phase_count: 2 },
    { course_id: masterclassId, phase_count: 3 },
  ]);

  it("keys authoritative phase rules by course UUID", () => {
    expect(configuration).toEqual({
      [regularId]: 2,
      [advancedId]: 2,
      [masterclassId]: 3,
    });
    expect(configuration[eightEntriesId]).toBeUndefined();
  });

  it("builds phase choices from the backend phase count", () => {
    expect(phaseOptions(configuration[regularId])).toEqual([1, 2]);
    expect(phaseOptions(configuration[masterclassId])).toEqual([1, 2, 3]);
    expect(phaseOptions(configuration[eightEntriesId])).toEqual([]);
  });

  it("defaults new phased lessons to Phase 1 without classifying legacy edits", () => {
    expect(initialPhaseNumber(2, null, false)).toBe(1);
    expect(initialPhaseNumber(2, null, true)).toBeNull();
    expect(initialPhaseNumber(3, 2, true)).toBe(2);
    expect(initialPhaseNumber(undefined, null, false)).toBeNull();
  });

  it("labels phased, unassigned, and unphased positions accurately", () => {
    expect(phasePositionLabel(2, 1, 3)).toBe("Phase 1 • Position 3");
    expect(phasePositionLabel(2, null, 4)).toBe("Unassigned Phase • Position 4");
    expect(phasePositionLabel(undefined, null, 2)).toBe("Position 2");
  });
});
