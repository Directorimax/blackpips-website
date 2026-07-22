import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Menu,
  UsersRound,
  Award,
  X,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { NAV } from "@/lib/site-data";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { useAuth } from "@/contexts/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_NAV = [
  { to: "/admin/payments" as const, label: "Payments", icon: CreditCard },
  {
    to: "/admin/mentorship-applications" as const,
    label: "Mentorship Applications",
    icon: GraduationCap,
  },
  { to: "/admin/lessons" as const, label: "Lessons", icon: BookOpen },
  { to: "/admin/students" as const, label: "Students", icon: UsersRound },
  { to: "/admin/certificates" as const, label: "Certificates", icon: Award },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  const dashboardDestination = isAdmin ? "/admin" : "/dashboard";

  return (
    <header className="no-print fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 max-w-7xl px-4">
        <div className="glass flex items-center justify-between rounded-full px-4 py-2.5 shadow-elegant">
          <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 xl:flex">
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

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="glass hidden rounded-full px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:inline-flex">
                    Admin
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Administration</DropdownMenuLabel>
                  {ADMIN_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to} className="cursor-pointer font-medium">
                          <Icon className="h-4 w-4 text-gold" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <ThemeToggle />
            {loading ? null : user ? (
              <>
                <Link
                  to={dashboardDestination}
                  className="hidden items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] sm:inline-flex"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="glass hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:inline-flex"
                >
                  <LogOut className="h-4 w-4" /> Sign out
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
              className="glass inline-flex h-9 w-9 items-center justify-center rounded-full xl:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="glass animate-float-up mt-2 rounded-2xl p-3 xl:hidden">
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
                  <Link
                    to={dashboardDestination}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-accent/60"
                  >
                    Dashboard
                  </Link>
                  {isAdmin && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gold">
                        Administration
                      </p>
                      {ADMIN_NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
                          >
                            <Icon className="h-4 w-4" /> {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-accent/60"
                >
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
