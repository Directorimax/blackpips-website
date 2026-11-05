import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  Clock,
  FileVideo,
  Hash,
  Layers,
  Link2,
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Unlink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  CENTRAL_MEDIA_RPC,
  describeDuration,
  type CentralMediaAsset,
  type MediaAssetStatus,
} from "@/lib/central-media-library";

export const Route = createFileRoute("/admin/media-library")({
  component: () => (
    <AuthenticatedRouteGuard>
      <CentralMediaLibrary />
    </AuthenticatedRouteGuard>
  ),
});
type Lesson = {
  lesson_id: string;
  lesson_title: string;
  course_id?: string;
  course_title: string;
  is_published: boolean;
  media_asset_id: string | null;
};
type Filters = {
  search: string;
  status: MediaAssetStatus | "all";
  course: string;
  assignment: "all" | "assigned" | "unassigned";
};

function CentralMediaLibrary() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<CentralMediaAsset[]>([]),
    [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    course: "all",
    assignment: "all",
  });
  const [drawer, setDrawer] = useState<CentralMediaAsset | null>(null),
    [details, setDetails] = useState<CentralMediaAsset | null>(null);
  const [selected, setSelected] = useState<string[]>([]),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [media, targets] = await Promise.all([
      supabase.rpc(CENTRAL_MEDIA_RPC.list),
      supabase.rpc(CENTRAL_MEDIA_RPC.lessons),
    ]);
    if (media.error) setError("The Central Media backend is unavailable. No media was changed.");
    else setAssets((media.data ?? []) as CentralMediaAsset[]);
    if (!targets.error) setLessons((targets.data ?? []) as Lesson[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);
  const courses = useMemo(
    () =>
      Array.from(
        new Map(lessons.filter((l) => l.course_title).map((l) => [l.course_title, l])).values(),
      ).map((l) => ({ id: l.course_id || l.course_title, name: l.course_title })),
    [lessons],
  );
  const visible = useMemo(
    () =>
      assets.filter((a) => {
        const q = filters.search.trim().toLowerCase();
        if (filters.status !== "all" && a.status !== filters.status) return false;
        if (filters.assignment === "assigned" && !a.usage_count) return false;
        if (filters.assignment === "unassigned" && a.usage_count) return false;
        if (
          filters.course !== "all" &&
          !a.usage.some((u) => (u.course_id || u.course_title) === filters.course)
        )
          return false;
        return (
          !q ||
          [a.title, a.object_key, ...a.usage.flatMap((u) => [u.course_title, u.lesson_title])]
            .join(" ")
            .toLowerCase()
            .includes(q)
        );
      }),
    [assets, filters],
  );
  const stats = [
    ["Total Videos", assets.length, FileVideo],
    ["Assigned", assets.filter((a) => a.usage_count > 0).length, Link2],
    ["Unassigned", assets.filter((a) => !a.usage_count).length, Unlink],
    ["Course Assignments", assets.reduce((n, a) => n + a.usage_count, 0), Layers],
  ] as const;
  function openDrawer(a: CentralMediaAsset) {
    setSelected(a.usage.map((u) => u.lesson_id));
    setDrawer(a);
  }
  async function save() {
    if (!drawer) return;
    setSaving(true);
    try {
      const before = new Set(drawer.usage.map((u) => u.lesson_id));
      for (const id of selected.filter((id) => !before.has(id))) {
        const target = lessons.find((l) => l.lesson_id === id);
        const r = await supabase.rpc(CENTRAL_MEDIA_RPC.attach, {
          p_lesson_id: id,
          p_media_asset_id: drawer.id,
          p_expected_media_asset_id: target?.media_asset_id ?? null,
        });
        if (r.error) throw r.error;
      }
      for (const u of drawer.usage.filter((u) => !selected.includes(u.lesson_id))) {
        const r = await supabase.rpc(CENTRAL_MEDIA_RPC.unlink, {
          p_lesson_id: u.lesson_id,
          p_expected_media_asset_id: drawer.id,
        });
        if (r.error) throw r.error;
      }
      toast.success("Assignments saved");
      setDrawer(null);
      await load();
    } catch {
      toast.error("Assignments were not changed. Refresh and retry.");
    } finally {
      setSaving(false);
    }
  }
  if (adminLoading || (!isAdmin && !error))
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="animate-spin text-gold" />
      </div>
    );
  const active =
    filters.search ||
    filters.status !== "all" ||
    filters.course !== "all" ||
    filters.assignment !== "all";
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Video Distribution Manager
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Manage private R2 videos and their canonical course and lesson assignments from one
            workspace.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, Icon], i) => (
          <div key={label} className="surface-card rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                {label}
              </span>
              <span
                className={`grid h-7 w-7 place-items-center rounded-lg ${i % 2 ? "bg-gold/10 text-gold" : "bg-muted text-muted-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">
              {loading ? "—" : value}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-8 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search videos..."
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <select
              value={filters.assignment}
              onChange={(e) =>
                setFilters((f) => ({ ...f, assignment: e.target.value as Filters["assignment"] }))
              }
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <select
              value={filters.course}
              onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))
              }
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">Any status</option>
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="unavailable">Unavailable</option>
              <option value="quarantined">Quarantined</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {loading
              ? "Loading…"
              : `${visible.length} video${visible.length === 1 ? "" : "s"} found`}
          </span>
          {active && (
            <button
              onClick={() =>
                setFilters({ search: "", status: "all", course: "all", assignment: "all" })
              }
            >
              <X className="mr-1 inline h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </section>
      {error && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          {error}
        </div>
      )}
      <section className="mt-5">
        {loading ? (
          <div className="grid min-h-64 place-items-center">
            <Loader2 className="animate-spin text-gold" />
          </div>
        ) : visible.length === 0 ? (
          <div className="surface-card rounded-xl border-dashed p-12 text-center text-muted-foreground">
            No videos match this view.
          </div>
        ) : (
          <VideoTable videos={visible} onDetails={setDetails} onAssign={openDrawer} />
        )}
      </section>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-gold" />
        One video, many lessons — the original private R2 asset is never duplicated.
      </p>
      <AssignmentDrawer
        open={!!drawer}
        video={drawer}
        lessons={lessons}
        selected={selected}
        setSelected={setSelected}
        saving={saving}
        onClose={() => setDrawer(null)}
        onSave={() => void save()}
      />
      {details && (
        <DetailsDialog
          video={details}
          onClose={() => setDetails(null)}
          onAssign={() => {
            setDetails(null);
            openDrawer(details);
          }}
        />
      )}
    </main>
  );
}

function VideoTable({
  videos,
  onDetails,
  onAssign,
}: {
  videos: CentralMediaAsset[];
  onDetails: (v: CentralMediaAsset) => void;
  onAssign: (v: CentralMediaAsset) => void;
}) {
  const [menu, setMenu] = useState("");
  return (
    <div className="surface-card overflow-visible rounded-xl">
      <div className="hidden grid-cols-[110px_minmax(0,1fr)_140px_180px_120px_60px] gap-4 border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground md:grid">
        <span>Video</span>
        <span>Title &amp; R2 key</span>
        <span>Duration</span>
        <span>Courses</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      <div className="divide-y">
        {videos.map((v) => (
          <div
            key={v.id}
            onClick={() => onDetails(v)}
            className="relative grid cursor-pointer grid-cols-1 gap-3 px-4 py-3 hover:bg-muted/40 md:grid-cols-[110px_minmax(0,1fr)_140px_180px_120px_60px] md:items-center md:gap-4"
          >
            <div className="relative grid h-14 w-24 place-items-center overflow-hidden rounded-lg border bg-gradient-to-br from-gold/15 to-muted">
              <span className="font-display text-lg font-bold text-gold">{v.title.charAt(0)}</span>
              <Play className="absolute bottom-1 right-1 h-4 w-4 rounded bg-black/50 p-1 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{v.title}</p>
              <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
                <Hash className="h-3 w-3" />
                {v.object_key}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {describeDuration(v.duration_seconds)}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="grid h-6 min-w-6 place-items-center rounded-md bg-gold/10 px-1.5 text-xs font-semibold text-gold">
                {v.usage_count}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {v.usage.length
                  ? v.usage
                      .slice(0, 2)
                      .map((u) => u.course_title)
                      .join(", ")
                  : "Unassigned"}
              </span>
            </div>
            <span>
              <span
                className={`rounded-md border px-2 py-1 text-xs ${v.status === "available" ? "border-gold/40 bg-gold/10 text-gold" : "text-muted-foreground"}`}
              >
                {v.status}
              </span>
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <button
                aria-label={`Actions for ${v.title}`}
                onClick={() => setMenu(menu === v.id ? "" : v.id)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menu === v.id && (
                <div className="absolute right-4 z-20 mt-1 w-56 rounded-xl border bg-popover p-1 shadow-xl">
                  <button
                    onClick={() => {
                      setMenu("");
                      onDetails(v);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Play className="h-4 w-4" />
                    View Video Details
                  </button>
                  <button
                    onClick={() => {
                      setMenu("");
                      onAssign(v);
                    }}
                    disabled={v.status !== "available"}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
                  >
                    <Settings2 className="h-4 w-4" />
                    Manage Assignments
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentDrawer({
  open,
  video,
  lessons,
  selected,
  setSelected,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  video: CentralMediaAsset | null;
  lessons: Lesson[];
  selected: string[];
  setSelected: (v: string[]) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [query, setQuery] = useState("");
  if (!open || !video) return null;
  const filtered = lessons.filter((l) =>
    `${l.course_title} ${l.lesson_title}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/55" onMouseDown={onClose}>
      <aside
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l bg-background shadow-2xl"
      >
        <header className="border-b px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Assign to Lessons</h2>
            <button onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose canonical course and lesson destinations. Existing videos are replaced only on
            save.
          </p>
        </header>
        <div className="flex items-center gap-3 border-b bg-muted/30 px-6 py-4">
          <div className="grid h-12 w-20 place-items-center rounded-lg border bg-gold/10 font-bold text-gold">
            {video.title.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold">{video.title}</p>
            <p className="text-[11px] text-muted-foreground">{video.usage_count} linked</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <label className="relative block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses or lessons…"
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3"
            />
          </label>
          <div className="mt-4 divide-y overflow-hidden rounded-xl border">
            {filtered.map((l) => {
              const checked = selected.includes(l.lesson_id);
              return (
                <button
                  key={l.lesson_id}
                  onClick={() =>
                    setSelected(
                      checked
                        ? selected.filter((id) => id !== l.lesson_id)
                        : [...selected, l.lesson_id],
                    )
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded border ${checked ? "border-gold bg-gold text-black" : ""}`}
                  >
                    {checked && <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.lesson_title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.course_title} · {l.is_published ? "Published" : "Draft"}
                      {l.media_asset_id && l.media_asset_id !== video.id
                        ? " · Replaces current video"
                        : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <footer className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Assignments"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function DetailsDialog({
  video,
  onClose,
  onAssign,
}: {
  video: CentralMediaAsset;
  onClose: () => void;
  onAssign: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">{video.title}</h2>
            <p className="text-sm text-muted-foreground">
              Video details &amp; assignment management
            </p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid aspect-video place-items-center rounded-xl border bg-black">
          <div className="text-center">
            <FileVideo className="mx-auto h-9 w-9 text-gold" />
            <p className="mt-2 text-sm text-zinc-400">
              Learner playback is not available in Website admin.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [Hash, "R2 key", video.object_key],
            [Clock, "Duration", describeDuration(video.duration_seconds)],
            [Calendar, "Storage", video.storage_provider.toUpperCase()],
            [Link2, "Assignments", String(video.usage_count)],
          ].map(([Icon, label, value]) => (
            <div key={label as string} className="surface-card min-w-0 rounded-lg p-3">
              <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3 w-3" />
                {label as string}
              </p>
              <p title={value as string} className="mt-1 truncate text-sm font-medium">
                {value as string}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onAssign}
            disabled={video.status !== "available"}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Manage Assignments
          </button>
        </div>
      </div>
    </div>
  );
}
