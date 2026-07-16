BlackPips is a huge scope — a full LMS + e-commerce + streaming + admin platform. I can't ship all of it well in one turn, so here's a realistic phased plan. Please confirm the phase order (or tell me what to prioritize) before I start building.

## What I'll build first (Phase 1 — Marketing site + design system)

A production-quality public website with the full BlackPips brand, so you have something beautiful to show immediately.

- Design system in `src/styles.css`: dark/light theme, gold + obsidian palette, glassmorphism tokens, gradients, shadows, animations (candlestick shimmer, gold shine, fade/scale/slide).
- Shared shell: sticky glass nav, theme toggle with smooth transition, footer, SEO meta per route (title/description/OG/twitter), sitemap.xml + robots.txt.
- Pages (each its own route, real content, not placeholders):
  - `/` Home — hero with animated candlestick canvas background, gold effects, headline, CTAs, Why BlackPips, What You'll Learn, Student Journey, Featured Premium Courses, Featured Free Lessons, FAQ, Contact, Newsletter.
  - `/courses` Premium courses grid (locked state, price, rating, difficulty, buy CTA).
  - `/free` Free lessons with categories (Beginner/Intermediate/Advanced), search, filter.
  - `/mentorship` Regular $100 / Advanced $200 / Masterclass $300 with full curricula you provided.
  - `/tools` Pips calculator + forex session clock + live prices widget (free public API).
  - `/blog` Article list with categories + a couple seed articles.
  - `/about`, `/contact` (form + WhatsApp/Email/Instagram/YouTube/Telegram), `/faq`, `/testimonials`.

Deliverable: fast, mobile responsive, SEO-optimized, animated, professional site. No backend yet — buttons for purchase/enroll route to a "coming soon / contact" state.

## Phase 2 — Accounts, dashboard, and content backend (Lovable Cloud)

- Enable Lovable Cloud (Supabase under the hood).
- Auth: email/password + Google, email verification, forgot/reset password.
- Tables: `profiles`, `user_roles` (admin/user via `has_role`), `courses`, `lessons`, `enrollments`, `progress`, `bookmarks`, `notes`, `articles`, `testimonials`, `orders`, `newsletter_subscribers`. RLS + explicit GRANTs on every table.
- `/dashboard` (protected): purchased courses, free courses, progress, account settings, payment history, placeholder for certificates.
- Video player with progress saving, continue watching, notes, playback speed, bookmarks. Right-click / common shortcut disable + dynamic on-screen watermark of user email. (Honest note in FAQ that no web player can fully prevent screen recording.)

## Phase 3 — Payments + course unlock

- Payments via Lovable's built-in Stripe payments (Visa, Mastercard, Apple Pay, Google Pay natively). Mobile Money isn't supported by Stripe globally — I'll flag that on checkout.
- Products for each premium course + 3 mentorship tiers.
- Checkout → webhook → automatic enrollment → email confirmation + invoice.

## Phase 4 — Admin panel

- `/admin` (admin role only): CRUD for users, courses, lessons, articles, testimonials, coupons; view orders, payments, messages, newsletter, analytics.

## Phase 5 — Hardening

- 2FA, session/device management, login activity, rate limiting on auth endpoints, audit log table, signed URLs for media, security headers.

## Things I want to be upfront about

- **True DRM** (Widevine / FairPlay / PlayReady) requires a licensed DRM provider (VdoCipher, Mux, Bitmovin, Cloudflare Stream, etc.) — not something Lovable can provision alone. I'll wire the player to work with any of those; you'll need to pick and connect one. Signed URLs + tokenized playback + watermark + shortcut blocking I can do natively.
- **Live market prices**: I'll use a free public API (e.g. Twelve Data / Finnhub free tier). Real-time XAUUSD/BTCUSD tick data at scale needs a paid provider — flagging so you can add a key later.
- **Mobile Money**: not covered by Stripe in most regions. Options: Flutterwave/Paystack connector, or region-specific integration once you tell me the target countries.
- **2FA + device session termination**: Supabase supports TOTP 2FA natively; enforcing "one active session" requires custom session tracking — included in Phase 5.

## Technical stack (already in place)

TanStack Start + React 19 + Tailwind v4 + shadcn. Lovable Cloud for backend when we enable it in Phase 2. Lovable's built-in Stripe for payments in Phase 3.

---

**Please confirm:** Should I start Phase 1 now (marketing site + full design system + all public pages)? Or do you want a different order — e.g. auth + dashboard first, or jump straight to payments?
