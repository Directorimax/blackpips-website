import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { getProfileAvatarUrl, subscribeToProfileAvatarChanges } from "@/lib/profile-avatar";
import { supabase } from "@/integrations/supabase/client";

export function useProfileAvatar() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const refreshAvatar = useCallback(async () => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("avatar")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Could not load profile avatar:", error);
      setAvatarUrl(null);
      return;
    }

    setAvatarUrl(await getProfileAvatarUrl(data?.avatar));
  }, [user]);

  useEffect(() => {
    void refreshAvatar();

    return subscribeToProfileAvatarChanges((detail) => {
      if (detail.userId !== user?.id) return;
      void getProfileAvatarUrl(detail.avatar).then(setAvatarUrl);
    });
  }, [refreshAvatar, user?.id]);

  return { avatarUrl, refreshAvatar };
}
