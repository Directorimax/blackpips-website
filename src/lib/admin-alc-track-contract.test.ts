import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accessSource = readFileSync(
  new URL("../routes/admin/alc-access.tsx", import.meta.url),
  "utf8",
);
const librarySource = readFileSync(
  new URL("../routes/admin/alc-library.tsx", import.meta.url),
  "utf8",
);

describe("Admin ALC track V2 contracts", () => {
  it("lists and reviews access requests only through V2", () => {
    expect(accessSource).toContain('"admin_list_alc_access_requests_v2"');
    expect(accessSource).toContain('"admin_review_alc_access_request_v2"');
    expect(accessSource).not.toContain('"admin_list_alc_access_requests"');
    expect(accessSource).not.toContain('"admin_review_alc_access_request"');
  });

  it("visually separates applicant evidence from Admin authorization", () => {
    expect(accessSource).toContain("Applicant said");
    expect(accessSource).toContain("Access assigned by Admin");
    expect(accessSource).toContain("Legacy access");
    expect(accessSource).toContain("Select authorized track");
  });

  it("uses track-aware module list and mutation contracts", () => {
    expect(librarySource).toContain('supabase.rpc("admin_list_alc_modules_v2")');
    expect(librarySource).toContain('supabase.rpc("admin_save_alc_module_v2"');
    expect(librarySource).toContain("p_alc_track: moduleForm.track");
  });

  it("keeps video media contracts unchanged and adds no video-level track", () => {
    expect(librarySource).toContain('supabase.rpc("admin_save_alc_video"');
    expect(librarySource).toContain('supabase.rpc("admin_initialize_alc_self_hosted_video"');
    expect(librarySource).toContain("startResumableAlcVideoUpload");
    expect(librarySource).not.toContain("p_video_track");
  });
});
