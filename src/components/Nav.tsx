import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Menu,
  UsersRound,
  Award,
  KeyRound,
  X,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  Sparkles,
  Video,
  Library,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_NAV = [
  { to: "/admin/media-library" as const, label: "Media Library", icon: Library },
  { to: "/admin/trading-tips" as const, label: "Trading Tips", icon: Sparkles },
  { to: "/admin/featured-videos" as const, label: "Featured Videos", icon: Video },
  { to: "/admin/alc-access" as const, label: "ALC Access", icon: KeyRound },
  { to: "/admin/alc-library" as const, label: "ALC Library", icon: BookOpen },
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

const TOOL_PATHS = ["/tools", "/trading-tips", "/trading-plan", "/dashboard/trading-plan"];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const { avatarUrl } = useProfileAvatar();
  const [profileIdentity, setProfileIdentity] = useState({
    fullName: "",
    username: "",
  });

  async function handleSignOut() {
    try {
      await signOut();
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      console.error("Could not sign out:", error);
      toast.error("We could not sign you out. Please try again.");
    }
  }

  async function handleSignOutAllDevices() {
    if (!window.confirm("Sign out of BlackPips on all devices?")) return;
    try {
      await signOut({ scope: "global" });
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      console.error("Could not sign out all devices:", error);
      toast.error("We could not sign you out on all devices. Please try again.");
    }
  }

  const dashboardDestination = isAdmin ? "/admin" : "/dashboard";
  const toolsActive = TOOL_PATHS.some((path) => location.pathname.startsWith(path));
  const initials = (profileIdentity.fullName || profileIdentity.username || user?.email || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!user) {
      setProfileIdentity({ fullName: "", username: "" });
      return;
    }
    let active = true;
    void supabase
      .from("profiles")
      .select("full_name,username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Could not load profile navigation details:", error);
        if (active) {
          setProfileIdentity({
            fullName: data?.full_name ?? "",
            username: data?.username ?? "",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  function handleMobileAdminOpenChange(nextOpen: boolean) {
    setMobileAdminOpen(nextOpen);
    if (nextOpen) {
      setOpen(false);
      setAccountMenuOpen(false);
    }
  }

  function handleAccountMenuOpenChange(nextOpen: boolean) {
    setAccountMenuOpen(nextOpen);
    if (nextOpen) {
      setMobileAdminOpen(false);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function linkClass(to: string) {
    const active = to === "/tools" ? toolsActive : undefined;
    return active ? "nav-link on" : "nav-link";
  }

  return (
    <header className="bp bp-chrome no-print fixed inset-x-0 top-0 z-50">
      <div className="nav">
        <div className="nav-in">
          <Link to="/" className="logo" aria-label="BLACKPIPS home" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className={linkClass(n.to)}
                activeProps={{ className: "on" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="nav-cta">
            {isAdmin && <AdminDropdown />}
            <ThemeToggle />
            {loading ? null : user ? (
              <>
                <Link to={dashboardDestination} className="btn btn-gold btn-sm hide-m">
                  <LayoutDashboard aria-hidden="true" /> Dashboard
                </Link>
                <DropdownMenu open={accountMenuOpen} onOpenChange={handleAccountMenuOpenChange}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Open account menu"
                      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <Avatar className="h-10 w-10 border border-gold/40">
                        <AvatarImage src={avatarUrl || undefined} alt="Your profile photo" />
                        <AvatarFallback className="bg-gradient-gold text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="truncate">
                      {profileIdentity.fullName || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer font-medium">
                        <UserRound className="h-4 w-4 text-gold" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => void handleSignOut()}
                      className="font-medium text-destructive"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => void handleSignOutAllDevices()}
                      className="font-medium text-destructive"
                    >
                      <ShieldCheck className="h-4 w-4" /> Sign out all devices
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isAdmin && (
                  <AdminDropdown
                    mobile
                    open={mobileAdminOpen}
                    onOpenChange={handleMobileAdminOpenChange}
                  />
                )}
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="btn btn-ghost btn-sm hide-m"
                >
                  Sign in
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} className="btn btn-gold btn-sm hide-s">
                  Get started
                </Link>
              </>
            )}
            <button
              type="button"
              className="icon-btn nav-burger"
              onClick={() => {
                setMobileAdminOpen(false);
                setAccountMenuOpen(false);
                setOpen((v) => !v);
              }}
              aria-label="Menu"
              aria-controls="mobile-navigation-menu"
              aria-expanded={open}
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        <nav
          id="mobile-navigation-menu"
          aria-label="Mobile"
          className={`mob-menu max-h-[calc(100dvh-6rem)] overflow-y-auto ${open ? "open" : ""}`}
        >
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "on" }}
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={dashboardDestination} onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <button type="button" className="mob-action" onClick={handleSignOut}>
                <LogOut aria-hidden="true" /> Sign out
              </button>
              <button type="button" className="mob-action danger" onClick={handleSignOutAllDevices}>
                <ShieldCheck aria-hidden="true" /> Sign out all devices
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function AdminDropdown({
  mobile = false,
  open,
  onOpenChange,
}: {
  mobile?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const menuId = mobile ? "mobile-admin-menu" : "desktop-admin-menu";
  const [alcPending, setAlcPending] = useState(0);
  useEffect(() => {
    void supabase
      .rpc("admin_alc_access_pending_count" as never)
      .then(({ data }) => setAlcPending(Number(data) || 0));
    const refresh = () =>
      void supabase
        .rpc("admin_alc_access_pending_count" as never)
        .then(({ data }) => setAlcPending(Number(data) || 0));
    window.addEventListener("alc-access-reviewed", refresh);
    return () => window.removeEventListener("alc-access-reviewed", refresh);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={mobile ? "Open admin menu" : undefined}
          aria-controls={menuId}
          className={mobile ? "icon-btn admin-mobile" : "btn btn-ghost btn-sm admin-desktop"}
        >
          {mobile ? <ShieldCheck aria-hidden="true" /> : "Admin"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        id={menuId}
        align="end"
        sideOffset={8}
        className="z-[80] max-h-[calc(100dvh-5rem)] w-60 max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        <DropdownMenuLabel>Administration</DropdownMenuLabel>
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.to} asChild>
              <Link
                to={item.to}
                onClick={() => onOpenChange?.(false)}
                className="min-h-11 cursor-pointer font-medium focus-visible:outline-none data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
              >
                <Icon className="h-4 w-4 text-gold" aria-hidden="true" /> {item.label}
                {item.to === "/admin/alc-access" && alcPending > 0 && (
                  <span className="ml-auto rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">
                    {alcPending}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
