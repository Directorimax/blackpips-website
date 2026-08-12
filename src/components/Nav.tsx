import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Menu,
  UsersRound,
  Award,
  Calculator,
  ChevronDown,
  ClipboardList,
  Clock,
  NotebookPen,
  KeyRound,
  X,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  Sparkles,
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
  { to: "/admin/trading-tips" as const, label: "Trading Tips", icon: Sparkles },
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

const TOOL_NAV = [
  {
    to: "/tips" as const,
    label: "Trading Tips",
    description: "Fresh insights from BlackPips",
    icon: Sparkles,
  },
  {
    to: "/alc-access" as const,
    label: "ALC Access",
    description: "Former student verification",
    icon: KeyRound,
  },
  {
    to: "/tools/pip-calculator" as const,
    label: "Pip Calculator",
    description: "Estimate pip values",
    icon: Calculator,
  },
  {
    to: "/tools/market-sessions" as const,
    label: "Market Sessions",
    description: "Check global session hours",
    icon: Clock,
  },
  {
    to: "/tools/trading-journal" as const,
    label: "Trading Journal",
    description: "Review your trade decisions",
    icon: NotebookPen,
  },
  {
    to: "/dashboard/trading-plan" as const,
    label: "Trading Plan",
    description: "Define your trading rules",
    icon: ClipboardList,
  },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
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
  const toolsActive =
    location.pathname.startsWith("/tools") || location.pathname === "/dashboard/trading-plan";
  const activeToolPath = location.pathname;
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
    if (!open) {
      setMobileToolsOpen(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleMobileAdminOpenChange(nextOpen: boolean) {
    setMobileAdminOpen(nextOpen);
    if (nextOpen) {
      setOpen(false);
      setMobileToolsOpen(false);
      setAccountMenuOpen(false);
    }
  }

  function handleAccountMenuOpenChange(nextOpen: boolean) {
    setAccountMenuOpen(nextOpen);
    if (nextOpen) {
      setMobileAdminOpen(false);
      setOpen(false);
      setMobileToolsOpen(false);
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

  return (
    <header className="no-print fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 max-w-7xl px-4">
        <div className="glass flex items-center justify-between rounded-full px-3 py-2.5 shadow-elegant sm:px-4">
          <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 xl:flex">
            {NAV.map((n) =>
              n.to === "/tools" ? (
                <ToolsDropdown key={n.to} activePath={activeToolPath} active={toolsActive} />
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent/60 data-[status=active]:text-foreground"
                >
                  {n.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && <AdminDropdown />}
            <ThemeToggle />
            {loading ? null : user ? (
              <>
                <Link
                  to={dashboardDestination}
                  className="hidden items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] sm:inline-flex"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
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
                        <AvatarFallback className="bg-gradient-gold text-xs font-bold text-primary-foreground">
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
              className="glass inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:hidden"
              onClick={() => {
                setMobileAdminOpen(false);
                setAccountMenuOpen(false);
                setOpen((v) => !v);
              }}
              aria-label="Menu"
              aria-controls="mobile-navigation-menu"
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div
            id="mobile-navigation-menu"
            aria-label="Navigation menu"
            className="glass animate-float-up mt-2 max-h-[calc(100dvh-5.75rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain rounded-2xl p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] xl:hidden"
          >
            <div className="grid gap-1">
              {NAV.map((n) =>
                n.to === "/tools" ? (
                  <MobileToolsMenu
                    key={n.to}
                    activePath={activeToolPath}
                    open={mobileToolsOpen}
                    onOpenChange={setMobileToolsOpen}
                    onSelect={() => {
                      setMobileToolsOpen(false);
                      setOpen(false);
                    }}
                  />
                ) : (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  >
                    {n.label}
                  </Link>
                ),
              )}
              <div className="my-1 h-px bg-border" />
              {user ? (
                <>
                  <Link
                    to={dashboardDestination}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold hover:bg-accent/60"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                  <button
                    onClick={handleSignOutAllDevices}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    <ShieldCheck className="h-4 w-4" /> Sign out all devices
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold hover:bg-accent/60"
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
          className={
            mobile
              ? "glass inline-flex h-10 w-10 items-center justify-center rounded-full text-gold transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:hidden sm:w-auto sm:gap-2 sm:px-3"
              : "glass hidden rounded-full px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:inline-flex"
          }
        >
          {mobile ? (
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span className="hidden text-sm font-semibold sm:inline">Admin</span>
            </>
          ) : (
            "Admin"
          )}
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

function ToolsDropdown({ activePath, active }: { activePath: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismissToolsMenu(open, menuRef, () => setOpen(false));

  function focusItem(index: number) {
    window.requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      items?.[index]?.focus();
    });
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            focusItem(event.key === "ArrowDown" ? 0 : TOOL_NAV.length - 1);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="tools-navigation-menu"
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-accent/60 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        Tools
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="tools-navigation-menu"
            role="menu"
            aria-label="Trading tools"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onKeyDown={onMenuKeyDown}
            className="absolute left-1/2 top-[calc(100%+0.75rem)] z-[70] w-72 -translate-x-1/2 rounded-2xl border border-gold/40 bg-popover/[0.98] p-2 text-popover-foreground shadow-[0_18px_45px_rgb(31_27_17_/_0.16)] backdrop-blur-sm dark:shadow-[0_18px_45px_rgb(0_0_0_/_0.42)]"
          >
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-foreground dark:text-gold">
              Trader tools
            </p>
            {TOOL_NAV.map((tool) => {
              const Icon = tool.icon;
              const isActive = activePath === tool.to;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 outline-none transition focus-visible:ring-2 focus-visible:ring-gold ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-foreground dark:text-gold">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{tool.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileToolsMenu({
  activePath,
  open,
  onOpenChange,
  onSelect,
}: {
  activePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useDismissToolsMenu(open, menuRef, () => onOpenChange(false));

  return (
    <div ref={menuRef} className="rounded-xl">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onOpenChange(false);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="mobile-tools-navigation-menu"
        className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Tools
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-tools-navigation-menu"
            role="menu"
            aria-label="Trading tools"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
            onKeyDown={(event) => {
              if (event.key === "Escape") onOpenChange(false);
            }}
          >
            <div className="ml-3 grid gap-1 border-l border-gold/25 py-1 pl-3">
              {TOOL_NAV.map((tool) => {
                const Icon = tool.icon;
                const isActive = activePath === tool.to;
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    role="menuitem"
                    onClick={onSelect}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-gold ${isActive ? "bg-gold/15 text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    <span>{tool.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function useDismissToolsMenu(
  open: boolean,
  menuRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss, open, menuRef]);
}
