import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminSource = readFileSync(
  new URL("../routes/admin/featured-videos.tsx", import.meta.url),
  "utf8",
);
const navSource = readFileSync(new URL("../components/Nav.tsx", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../../supabase/migrations/20260913_create_featured_videos.sql", import.meta.url),
  "utf8",
);

describe("featured video Admin and database contract", () => {
  it("exposes the Admin manager through existing navigation", () => {
    expect(navSource).toContain('to: "/admin/featured-videos"');
    expect(adminSource).toContain('createFileRoute("/admin/featured-videos")');
    expect(adminSource).toContain("useAdmin()");
  });

  it("uses checked Admin RPCs for every mutation", () => {
    expect(adminSource).toContain('rpc("admin_save_featured_video"');
    expect(adminSource).toContain('rpc("admin_move_featured_video"');
    expect(adminSource).toContain('rpc("admin_delete_featured_video"');
    expect(adminSource).not.toContain('.from("featured_videos").insert');
    expect(adminSource).not.toContain("service_role");
  });

  it("enforces active-only learner reads and the maximum in the database", () => {
    expect(migration).toContain("using (is_active or public.is_admin())");
    expect(migration).toContain("A maximum of 5 featured videos may be active");
    expect(migration).toContain("pg_advisory_xact_lock(hashtext('featured_videos_active_limit'))");
    expect(migration).toContain("order by v.display_order, v.id");
    expect(migration).toContain("function public.list_featured_videos()");
    expect(migration).toContain("where v.is_active");
  });

  it("keeps Admin mutations role checked and anonymous callers denied", () => {
    expect(migration).toContain("if not public.is_admin()");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });

  it("has explicit empty, toggle, reorder, and confirmed-delete behavior", () => {
    expect(adminSource).toContain("No featured videos configured");
    expect(adminSource).toContain("window.confirm");
    expect(adminSource).toContain('move(video, "up")');
    expect(adminSource).toContain('move(video, "down")');
    expect(adminSource).toContain('video.is_active ? "Disable" : "Enable"');
  });
});
