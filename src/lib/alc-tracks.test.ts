import { describe, expect, it } from "vitest";
import { ALC_TRACKS, alcTrackLabel, buildAlcReviewArgs, isAlcTrack } from "./alc-tracks";

describe("ALC tracks", () => {
  it("accepts only canonical backend track values", () => {
    expect(ALC_TRACKS).toEqual(["regular", "advanced", "masterclass"]);
    expect(isAlcTrack("regular")).toBe(true);
    expect(isAlcTrack("advanced")).toBe(true);
    expect(isAlcTrack("masterclass")).toBe(true);
    expect(isAlcTrack("Regular Class")).toBe(false);
    expect(isAlcTrack(null)).toBe(false);
  });

  it("uses Admin-facing labels without changing normalized values", () => {
    expect(alcTrackLabel("regular")).toBe("Regular ALC");
    expect(alcTrackLabel("advanced")).toBe("Advanced ALC");
    expect(alcTrackLabel("masterclass")).toBe("Masterclass ALC");
    expect(alcTrackLabel(null)).toBe("Unassigned");
  });

  it("requires an Admin-confirmed track for approval", () => {
    expect(() =>
      buildAlcReviewArgs({
        requestId: "request-1",
        status: "approved",
        assignedTrack: null,
        adminNotes: null,
        publicReviewMessage: null,
      }),
    ).toThrow("track is required");
    expect(
      buildAlcReviewArgs({
        requestId: "request-1",
        status: "approved",
        assignedTrack: "advanced",
        adminNotes: "Verified",
        publicReviewMessage: "Approved",
      }),
    ).toMatchObject({ p_status: "approved", p_assigned_track: "advanced" });
  });

  it("always clears a stale selected track when rejecting", () => {
    expect(
      buildAlcReviewArgs({
        requestId: "request-2",
        status: "rejected",
        assignedTrack: "masterclass",
        adminNotes: null,
        publicReviewMessage: null,
      }),
    ).toMatchObject({ p_status: "rejected", p_assigned_track: null });
  });
});
