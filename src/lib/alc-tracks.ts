export const ALC_TRACKS = ["regular", "advanced", "masterclass"] as const;

export type AlcTrack = (typeof ALC_TRACKS)[number];

export const ALC_TRACK_LABELS: Record<AlcTrack, string> = {
  regular: "Regular ALC",
  advanced: "Advanced ALC",
  masterclass: "Masterclass ALC",
};

export function isAlcTrack(value: unknown): value is AlcTrack {
  return typeof value === "string" && ALC_TRACKS.includes(value as AlcTrack);
}

export function alcTrackLabel(value: AlcTrack | null | undefined): string {
  return value ? ALC_TRACK_LABELS[value] : "Unassigned";
}

export function buildAlcReviewArgs(input: {
  requestId: string;
  status: "approved" | "rejected";
  assignedTrack: AlcTrack | null;
  adminNotes: string | null;
  publicReviewMessage: string | null;
}) {
  if (input.status === "approved" && !isAlcTrack(input.assignedTrack)) {
    throw new Error("An ALC track is required for approval.");
  }
  return {
    p_request_id: input.requestId,
    p_status: input.status,
    p_assigned_track: input.status === "approved" ? input.assignedTrack : null,
    p_admin_notes: input.adminNotes,
    p_public_review_message: input.publicReviewMessage,
  };
}
