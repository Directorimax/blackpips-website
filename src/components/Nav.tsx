import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { NAV } from "@/lib/site-data";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

export function Nav() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initial = (user?.user_metadata?.display_name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 max-w-7xl px-4">
        <div className="glass flex items-center justify-between rounded-full px-4 py-2.5 shadow-elegant">
          <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground data-[status=active]:bg-accent/60"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loading ? null : user ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] sm:inline-flex"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="glass hidden h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold hover:text-gold sm:inline-flex"
                  title={user.email ?? "Account"}
                >
                  {initial}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="hidden rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] sm:inline-flex"
                >
                  Get started
                </Link>
              </>
            )}
            <button
              className="glass inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="glass animate-float-up mt-2 rounded-2xl p-3 lg:hidden">
            <div className="grid gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-border" />
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-accent/60">
                    Dashboard
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-accent/60">
                  Sign in / Get started
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
