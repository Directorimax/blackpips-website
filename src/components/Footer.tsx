import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Send, Mail } from "lucide-react";
import { Logo } from "./Logo";
import { SITE, NAV } from "@/lib/site-data";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Premium forex education. Learn the complete institutional trading approach through the ALC strategy — beginner to advanced.
            </p>
            <div className="mt-5 flex gap-2">
              <a href={SITE.instagram} aria-label="Instagram" className="glass inline-flex h-9 w-9 items-center justify-center rounded-full hover:text-gold"><Instagram className="h-4 w-4" /></a>
              <a href={SITE.youtube} aria-label="YouTube" className="glass inline-flex h-9 w-9 items-center justify-center rounded-full hover:text-gold"><Youtube className="h-4 w-4" /></a>
              <a href={SITE.telegram} aria-label="Telegram" className="glass inline-flex h-9 w-9 items-center justify-center rounded-full hover:text-gold"><Send className="h-4 w-4" /></a>
              <a href={`mailto:${SITE.email}`} aria-label="Email" className="glass inline-flex h-9 w-9 items-center justify-center rounded-full hover:text-gold"><Mail className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Explore</h4>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
              {NAV.slice(0, 5).map((n) => (
                <li key={n.to}><Link to={n.to} className="hover:text-foreground">{n.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/testimonials" className="hover:text-foreground">Testimonials</Link></li>
              <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Trading involves risk. Education only — no signals, no account management.</p>
        </div>
      </div>
    </footer>
  );
}
