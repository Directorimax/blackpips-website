import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — BlackPips" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

const pw = z.string().min(8, "Minimum 8 characters").max(72);

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = pw.parse(password);
      const { error } = await supabase.auth.updateUser({ password: p });
      if (error) throw error;
      toast.success("Password updated.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof z.ZodError ? err.issues[0].message : err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16">
      <form onSubmit={onSubmit} className="glass w-full rounded-3xl p-8 shadow-elegant">
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose something at least 8 characters long.</p>
        <label className="mt-6 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">New password</span>
          <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
      </form>
    </div>
  );
}
