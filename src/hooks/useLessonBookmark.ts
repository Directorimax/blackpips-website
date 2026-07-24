import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

function logBookmarkError(
  action: string,
  error: { code?: string; message?: string; details?: string; hint?: string },
) {
  console.error(`[bookmarks] Premium lesson ${action} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

export function useLessonBookmark(lessonId: string | null) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !lessonId) {
      setBookmarked(false);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) logBookmarkError("load", error);
        if (!active) return;
        setBookmarked(Boolean(data));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lessonId, user]);

  const toggleBookmark = useCallback(async () => {
    if (!user || !lessonId || saving) return;

    const wasBookmarked = bookmarked;
    setSaving(true);
    setBookmarked(!wasBookmarked);

    const { error } = wasBookmarked
      ? await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("lesson_id", lessonId)
      : await supabase
          .from("bookmarks")
          .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });

    if (error) {
      logBookmarkError(wasBookmarked ? "removal" : "save", error);
      setBookmarked(wasBookmarked);
      toast.error(wasBookmarked ? "Could not remove saved lesson." : "Could not save lesson.");
    } else if (!wasBookmarked) {
      toast.success("Saved successfully");
    }

    setSaving(false);
  }, [bookmarked, lessonId, saving, user]);

  return { bookmarked, loading, saving, toggleBookmark };
}
