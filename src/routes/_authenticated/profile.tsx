import { createFileRoute } from "@tanstack/react-router";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Profile — BLACKPIPS" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

const PROFILE_IMAGE_BUCKET = "profile-images";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be 30 characters or fewer.")
  .regex(/^[A-Za-z0-9_]+$/, "Use only letters, numbers, and underscores.");
const passwordSchema = z.string().min(8, "Minimum 8 characters").max(72);

type ProfileForm = {
  full_name: string;
  username: string;
  bio: string;
  country: string;
  timezone: string;
  avatar: string | null;
  created_at: string | null;
};

const EMPTY_PROFILE: ProfileForm = {
  full_name: "",
  username: "",
  bio: "",
  country: "",
  timezone: "",
  avatar: null,
  created_at: null,
};

function logStorageError(action: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(`[profile] Avatar ${action} failed`, error);
    return;
  }
  const storageError = error as {
    name?: unknown;
    message?: unknown;
    statusCode?: unknown;
    cause?: unknown;
  };
  console.error(`[profile] Avatar ${action} failed`, {
    name: storageError.name,
    message: storageError.message,
    statusCode: storageError.statusCode,
    cause: storageError.cause,
  });
}

async function getAvatarPreviewUrl(avatar: string | null) {
  if (!avatar || /^https?:\/\//i.test(avatar)) return avatar;
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(avatar, 60 * 60);
  if (error) {
    console.error("Could not create profile image URL:", error);
    return null;
  }
  return data.signedUrl;
}

function ProfilePage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [savedProfile, setSavedProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,username,bio,avatar,country,timezone,created_at")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Could not load profile:", error);
        toast.error("We could not load your profile. Please try again.");
      }

      const nextProfile: ProfileForm = {
        full_name:
          data?.full_name ??
          currentUser.user_metadata?.full_name ??
          currentUser.user_metadata?.display_name ??
          "",
        username: data?.username ?? "",
        bio: data?.bio ?? "",
        country: data?.country ?? "",
        timezone: data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
        avatar: data?.avatar ?? null,
        created_at: data?.created_at ?? currentUser.created_at ?? null,
      };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      void getAvatarPreviewUrl(nextProfile.avatar).then(setAvatarPreview);
      setLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const initials = useMemo(
    () =>
      (profile.full_name || profile.username || user?.email || "U")
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [profile.full_name, profile.username, user?.email],
  );
  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);
  const passwordsDoNotMatch = Boolean(confirmPassword) && newPassword !== confirmPassword;
  const passwordValid = passwordSchema.safeParse(newPassword).success;
  const canChangePassword =
    Boolean(currentPassword) &&
    Boolean(newPassword) &&
    Boolean(confirmPassword) &&
    passwordValid &&
    !passwordsDoNotMatch &&
    !changingPassword;

  function updateProfileField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !hasChanges || saving) return;

    setSaving(true);
    try {
      const fullName = z
        .string()
        .trim()
        .min(1, "Enter your full name.")
        .max(80)
        .parse(profile.full_name);
      const username = usernameSchema.parse(profile.username);
      const bio = z
        .string()
        .trim()
        .max(500, "Bio must be 500 characters or fewer.")
        .parse(profile.bio);
      const country = z.string().trim().max(80).parse(profile.country);
      const timezone = z.string().trim().max(80).parse(profile.timezone);

      const { data: existingUsername, error: usernameError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (usernameError && usernameError.code !== "PGRST116") throw usernameError;
      if (existingUsername && existingUsername.id !== user.id) {
        throw new Error("That username is already in use.");
      }

      const update = {
        full_name: fullName,
        username,
        bio: bio || null,
        country: country || null,
        timezone: timezone || null,
        avatar: profile.avatar,
      };
      const { data: saved, error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", user.id)
        .select("full_name,username,bio,country,timezone,avatar,created_at")
        .single();
      if (error) {
        console.error("[profile] Save request failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        if (error.code === "23505") throw new Error("That username is already in use.");
        throw error;
      }

      const { error: authMetadataError } = await supabase.auth.updateUser({
        data: { full_name: fullName, display_name: fullName },
      });
      if (authMetadataError)
        console.error("[profile] Could not update auth metadata", authMetadataError);
      const nextProfile: ProfileForm = {
        full_name: saved.full_name ?? fullName,
        username: saved.username ?? username,
        bio: saved.bio ?? "",
        country: saved.country ?? "",
        timezone: saved.timezone ?? "",
        avatar: saved.avatar,
        created_at: saved.created_at,
      };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      toast.success("Profile saved.");
    } catch (error) {
      console.error("Could not save profile:", error);
      toast.error(
        error instanceof z.ZodError
          ? error.issues[0]?.message
          : error instanceof Error
            ? error.message
            : "We could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file.");
    if (file.size > MAX_PROFILE_IMAGE_SIZE)
      return toast.error("Profile images must be 5 MB or smaller.");

    setUploading(true);
    try {
      const path = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_IMAGE_BUCKET)
        .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: true });
      if (uploadError) {
        logStorageError("upload", uploadError);
        throw uploadError;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar: path })
        .eq("id", user.id)
        .select("avatar")
        .single();
      if (profileError) {
        console.error("[profile] Avatar profile update failed", {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });
        if (profile.avatar !== path) {
          const { error: cleanupError } = await supabase.storage
            .from(PROFILE_IMAGE_BUCKET)
            .remove([path]);
          if (cleanupError) logStorageError("cleanup", cleanupError);
        }
        throw profileError;
      }
      const nextProfile = { ...profile, avatar: path };
      setProfile(nextProfile);
      setSavedProfile({ ...savedProfile, avatar: path });
      setAvatarPreview(await getAvatarPreviewUrl(path));
      toast.success("Profile photo updated.");
    } catch (error) {
      console.error("Could not upload profile image:", error);
      toast.error("We could not upload your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!profile.avatar || uploading || !user) return;
    setUploading(true);
    try {
      const objectKey = profile.avatar;
      if (!objectKey.startsWith(`${user.id}/`)) {
        throw new Error("Your profile photo key is invalid. Please upload a new photo.");
      }
      const { error: removeError } = await supabase.storage
        .from(PROFILE_IMAGE_BUCKET)
        .remove([objectKey]);
      if (removeError) {
        logStorageError("removal", removeError);
        throw removeError;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar: null })
        .eq("id", user.id)
        .select("avatar")
        .single();
      if (profileError) {
        console.error("[profile] Avatar removal profile update failed", {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });
        throw profileError;
      }
      const nextProfile = { ...profile, avatar: null };
      setProfile(nextProfile);
      setSavedProfile({ ...savedProfile, avatar: null });
      setAvatarPreview(null);
      toast.success("Profile photo removed.");
    } catch (error) {
      console.error("Could not remove profile image:", error);
      toast.error("We could not remove your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canChangePassword) return;
    setChangingPassword(true);
    try {
      const password = passwordSchema.parse(newPassword);
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      if (!user.email) throw new Error("Your email address is unavailable. Please sign in again.");

      const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (currentPasswordError) throw new Error("Your current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (error) {
      console.error("Could not change password:", error);
      toast.error(
        error instanceof z.ZodError
          ? error.issues[0]?.message
          : error instanceof Error
            ? error.message
            : "We could not update your password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-8rem)] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="glass rounded-3xl p-6 shadow-elegant sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Avatar className="h-28 w-28 border-2 border-gold/50 shadow-glow">
              <AvatarImage src={avatarPreview ?? undefined} alt="Your profile photo" />
              <AvatarFallback className="bg-gradient-gold font-display text-3xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-gold/40 bg-card text-gold shadow-elegant transition hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-gold">
              Your account
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              {profile.full_name || "BLACKPIPS learner"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.username ? `@${profile.username}` : "Choose a username below"}
            </p>
            <p className="mt-3 break-all text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:text-right">
            <span>
              Member since{" "}
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
            <PlanBadge userId={user?.id} />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={saveProfile} className="glass rounded-3xl p-6 shadow-elegant sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Account information</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your BLACKPIPS profile up to date.
              </p>
            </div>
            <UserRound className="h-5 w-5 text-gold" />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={uploadAvatar}
            className="sr-only"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold hover:text-gold disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />{" "}
              {uploading ? "Uploading photo…" : profile.avatar ? "Replace photo" : "Upload photo"}
            </button>
            {profile.avatar && (
              <button
                type="button"
                onClick={() => void removeAvatar()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> Remove photo
              </button>
            )}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ProfileField label="Full name">
              <input
                required
                value={profile.full_name}
                onChange={(event) => updateProfileField("full_name", event.target.value)}
                maxLength={80}
                className="w-full bg-transparent outline-none"
              />
            </ProfileField>
            <ProfileField label="Username">
              <input
                required
                value={profile.username}
                onChange={(event) => updateProfileField("username", event.target.value)}
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                className="w-full bg-transparent outline-none"
                placeholder="trader_name"
              />
            </ProfileField>
            <ProfileField label="Country">
              <input
                value={profile.country}
                onChange={(event) => updateProfileField("country", event.target.value)}
                maxLength={80}
                className="w-full bg-transparent outline-none"
              />
            </ProfileField>
            <ProfileField label="Timezone">
              <input
                value={profile.timezone}
                onChange={(event) => updateProfileField("timezone", event.target.value)}
                maxLength={80}
                className="w-full bg-transparent outline-none"
                placeholder="Africa/Nairobi"
              />
            </ProfileField>
            <div className="sm:col-span-2">
              <ProfileField label="Bio (optional)">
                <textarea
                  value={profile.bio}
                  onChange={(event) => updateProfileField("bio", event.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full resize-y bg-transparent outline-none"
                />
              </ProfileField>
            </div>
            <ProfileField label="Email">
              <input
                value={user?.email ?? ""}
                disabled
                className="w-full bg-transparent text-muted-foreground outline-none"
              />
            </ProfileField>
            <ProfileField label="User ID">
              <input
                value={user?.id ?? ""}
                disabled
                className="w-full bg-transparent text-muted-foreground outline-none"
              />
            </ProfileField>
          </div>
          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={!hasChanges || saving}
              onClick={() => setProfile(savedProfile)}
              className="glass rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={!hasChanges || saving || uploading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
            </button>
          </div>
        </form>

        <form
          onSubmit={changePassword}
          className="glass h-fit rounded-3xl p-6 shadow-elegant sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Account security</h2>
              <p className="mt-1 text-sm text-muted-foreground">Use a strong, private password.</p>
            </div>
            <KeyRound className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-6 grid gap-4">
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrentPassword}
              onToggle={() => setShowCurrentPassword((current) => !current)}
              autoComplete="current-password"
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((current) => !current)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
              autoComplete="new-password"
            />
          </div>
          {newPassword && !passwordValid && (
            <p className="mt-2 text-xs text-destructive">Minimum 8 characters.</p>
          )}
          {passwordsDoNotMatch && (
            <p className="mt-2 text-xs text-destructive">Passwords do not match.</p>
          )}
          <button
            disabled={!canChangePassword}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="glass rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-gold/40">
        {children}
      </div>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-gold/40">
        <input
          required
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function PlanBadge({ userId }: { userId: string | undefined }) {
  const [plan, setPlan] = useState("FREE");
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void Promise.all([
      supabase.from("purchases").select("id").eq("user_id", userId).limit(1),
      supabase
        .from("mentorship_applications")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .limit(1),
    ]).then(([purchases, mentorship]) => {
      if (active)
        setPlan(
          mentorship.data?.length ? "MENTORSHIP" : purchases.data?.length ? "PREMIUM" : "FREE",
        );
    });
    return () => {
      active = false;
    };
  }, [userId]);
  return (
    <span className="justify-self-start rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold tracking-wide text-gold sm:justify-self-end">
      {plan}
    </span>
  );
}
