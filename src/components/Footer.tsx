import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Send, Mail } from "lucide-react";
import { Logo } from "./Logo";
import { SITE, NAV, PRIORITY_DESTINATIONS } from "@/lib/site-data";
import { AvailabilityAwareContactLink } from "@/components/contact/AvailabilityAwareContactLink";

export function Footer() {
  return (
    <footer className="bp bp-chrome no-print">
      <div className="footer">
        <div className="wrap">
          <div className="foot-grid foot-grid-5">
            <div className="stack" style={{ gap: 18 }}>
              <Link to="/" className="logo" aria-label="BLACKPIPS home">
                <Logo />
              </Link>
              <p className="small" style={{ maxWidth: 300 }}>
                Premium forex education. Learn the complete institutional trading approach through
                the ALC strategy — beginner to advanced.
              </p>
              <div className="row" style={{ gap: 8 }}>
                <AvailabilityAwareContactLink
                  href={SITE.instagram}
                  aria-label="Instagram"
                  className="icon-btn"
                >
                  <Instagram aria-hidden="true" />
                </AvailabilityAwareContactLink>
                <a href={SITE.youtube} aria-label="YouTube" className="icon-btn">
                  <Youtube aria-hidden="true" />
                </a>
                <a href={SITE.telegram} aria-label="Telegram" className="icon-btn">
                  <Send aria-hidden="true" />
                </a>
                <AvailabilityAwareContactLink
                  href={`mailto:${SITE.email}`}
                  aria-label="Email BLACKPIPS support"
                  className="icon-btn"
                >
                  <Mail aria-hidden="true" />
                </AvailabilityAwareContactLink>
              </div>
            </div>

            <div>
              <p className="foot-h">Trading Tools</p>
              {PRIORITY_DESTINATIONS.map((destination) => (
                <Link key={destination.to} to={destination.to} className="foot-a">
                  {destination.label}
                </Link>
              ))}
            </div>

            <div>
              <p className="foot-h">Explore</p>
              {NAV.slice(0, 4).map((n) => (
                <Link key={n.to} to={n.to} className="foot-a">
                  {n.label}
                </Link>
              ))}
              <Link to="/free" className="foot-a">
                Free Lessons
              </Link>
            </div>

            <div>
              <p className="foot-h">Company</p>
              <Link to="/about" className="foot-a">
                About
              </Link>
              <Link to="/testimonials" className="foot-a">
                Testimonials
              </Link>
              <Link to="/faq" className="foot-a">
                FAQ
              </Link>
              <Link to="/contact" className="foot-a">
                Contact
              </Link>
              <Link to="/privacy-policy" className="foot-a">
                Privacy Policy
              </Link>
              <Link to="/delete-account" className="foot-a">
                Delete Account
              </Link>
            </div>

            <div>
              <p className="foot-h">Support</p>
              <AvailabilityAwareContactLink href={`mailto:${SITE.email}`} className="foot-a">
                {SITE.email}
              </AvailabilityAwareContactLink>
              <AvailabilityAwareContactLink
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="foot-a"
              >
                WhatsApp
              </AvailabilityAwareContactLink>
              <Link to="/contact" className="foot-a">
                Contact us
              </Link>
            </div>
          </div>
          <hr className="divider" />
          <div className="between small" style={{ padding: "24px 0", flexWrap: "wrap" }}>
            <span>© {new Date().getFullYear()} BLACKPIPS. All rights reserved.</span>
            <span>Trading involves risk. Education only — no signals, no account management.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
