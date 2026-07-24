import { supabase } from "@/integrations/supabase/client";

export const PROFILE_IMAGE_BUCKET = "profile-images";

const PROFILE_AVATAR_CHANGED_EVENT = "blackpips:profile-avatar-changed";

type ProfileAvatarChangedDetail = {
  userId: string;
  avatar: string | null;
};

export async function getProfileAvatarUrl(avatar: string | null | undefined) {
  if (!avatar || /^https?:\/\//i.test(avatar)) return avatar ?? null;

  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(avatar, 60 * 60);

  if (error) {
    console.error("Could not create profile image URL:", error);
    return null;
  }

  return data.signedUrl;
}

export function notifyProfileAvatarChanged(userId: string, avatar: string | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ProfileAvatarChangedDetail>(PROFILE_AVATAR_CHANGED_EVENT, {
      detail: { userId, avatar },
    }),
  );
}

export function subscribeToProfileAvatarChanges(
  listener: (detail: ProfileAvatarChangedDetail) => void,
) {
  if (typeof window === "undefined") return () => undefined;

  const handleChange = (event: Event) => {
    listener((event as CustomEvent<ProfileAvatarChangedDetail>).detail);
  };

  window.addEventListener(PROFILE_AVATAR_CHANGED_EVENT, handleChange);
  return () => window.removeEventListener(PROFILE_AVATAR_CHANGED_EVENT, handleChange);
}
