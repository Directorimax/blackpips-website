import { describe, expect, it } from "vitest";
import { getOverlapSnapshot, OVERLAP_DEFINITIONS } from "./market-session-overlaps";

describe("market session overlaps", () => {
  it("calculates all configured overlaps from IANA-aware session intervals", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    const snapshots = OVERLAP_DEFINITIONS.map((definition) =>
      getOverlapSnapshot(definition, now, "Africa/Dar_es_Salaam", "24h"),
    );
    expect(snapshots.map((snapshot) => snapshot.definition.id)).toEqual([
      "sydney-tokyo",
      "tokyo-london",
      "london-new-york",
    ]);
    expect(snapshots.every((snapshot) => snapshot.durationMinutes > 0)).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.nextStart.getTime() > now.getTime())).toBe(true);
  });

  it("marks the London–New York overlap active during their shared window", () => {
    const definition = OVERLAP_DEFINITIONS.find((overlap) => overlap.id === "london-new-york")!;
    const snapshot = getOverlapSnapshot(definition, new Date("2026-08-05T14:00:00Z"), "UTC", "24h");
    expect(snapshot.isActive).toBe(true);
    expect(snapshot.displayStart).toBe("12:00");
    expect(snapshot.displayEnd).toBe("16:00");
    expect(snapshot.durationMinutes).toBe(240);
  });
});
