export const SITE = {
  name: "BlackPips",
  tagline: "Master Forex Trading with ALC Strategy",
  description:
    "Premium forex education. Learn the complete institutional trading approach — from beginner to advanced — through the ALC strategy.",
  email: "blackpipsfxtz@gmail.com",
  whatsapp: "https://wa.me/10000000000",
  instagram: "https://www.instagram.com/blackpips/",
  youtube: "https://www.youtube.com/@blackpips8",
  telegram: "https://t.me/blackpips",
};

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Premium Lessons" },
  { to: "/free", label: "Free Lessons" },
  { to: "/mentorship", label: "Mentorship" },
  { to: "/tools", label: "Tools" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export const WHY = [
  { title: "Institutional Approach", desc: "Learn how banks and smart money actually move the market — not retail indicators." },
  { title: "ALC Strategy", desc: "A complete framework covering structure, liquidity, entries and risk — built to be repeatable." },
  { title: "Zero Fluff", desc: "Every lesson is edited to the point. No filler, no hype — pure decision-grade content." },
  { title: "Lifetime Access", desc: "Enroll once, keep every future update to the curriculum forever." },
  { title: "Private Community", desc: "Study alongside serious traders in a mentored, moderated environment." },
  { title: "Progress Tracking", desc: "Your dashboard remembers exactly where you left off — resume any lesson instantly." },
];

export const LEARN = [
  "Bullish & Bearish market structure",
  "Break of structure (BOS) validation",
  "Liquidity engineering & failed LE",
  "Flip zones, MoC and imbalances",
  "Directional bias & timeframe coordination",
  "Eight entry types (T1 → T8)",
  "XAUUSD session-based execution",
  "Top-down analysis workflow",
];

export const JOURNEY = [
  { step: "01", title: "Foundation", desc: "Master market structure, phases and swing points." },
  { step: "02", title: "Framework", desc: "Layer in liquidity, formations and flip zones." },
  { step: "03", title: "Execution", desc: "Deploy the eight ALC entry types with confidence." },
  { step: "04", title: "Mastery", desc: "Session trading, gold specialization, top-down bias." },
];

export const COURSES = [
  {
    slug: "alc-foundations",
    title: "Regular ALC",
    instructor: "BlackPips Desk",
    level: "REGURAL",
    lessons: 24,
    duration: "6h 40m",
    rating: 4.9,
    price: 40,
    description: "The complete entry point to the ALC methodology — structure, BOS and clean chart reading.",
  },
  {
    slug: "liquidity-engine",
    title: "Advanced ALC",
    instructor: "BlackPips Desk",
    level: "ADVANCE",
    lessons: 32,
    duration: "9h 10m",
    rating: 4.9,
    price: 100,
    description: "Decode how liquidity is engineered, consumed and failed — the beating heart of institutional flow.",
  },
  {
    slug: "eight-entries",
    title: "ALC Masterclass",
    instructor: "BlackPips Desk",
    level: "MASTER",
    lessons: 41,
    duration: "12h 05m",
    rating: 5.0,
    price: 200,
    description: "T1 through T8 broken down with backtested examples, LTF switching and DTO scenarios.",
  },
  {
    slug: "xauusd-mastery",
    title: "The Eight Entries",
    instructor: "BlackPips Desk",
    level: "8ENTRIES",
    lessons: 28,
    duration: "8h 20m",
    rating: 4.8,
    price: 80,
    description: "Trade gold with session-specific ALC and INT playbooks — from Asia into New York.",
  },
];

export const FREE_LESSONS = [
  { id: "f1", title: "Introduction of Forex", level: "Beginner", duration: "12:04" },
  { id: "f2", title: "Market Structure, Candles and more", level: "Beginner", duration: "9:41" },
  { id: "f3", title: "Order Types, Pips and Lotsize Explained", level: "Beginner", duration: "14:22" },
  { id: "f4", title: "Break of Structure Explained", level: "Advanced", duration: "18:11" },
  { id: "f5", title: "Reading the Daily Bias", level: "Advanced", duration: "16:50" },
  { id: "f6", title: "Fair Value Gaps in Practice", level: "Advanced", duration: "13:37" },
  { id: "f7", title: "Session Timing for XAUUSD", level: "Advanced", duration: "21:09" },
  { id: "f8", title: "Top-Down Analysis Walkthrough", level: "Advanced", duration: "27:44" },
];

export const MENTORSHIP = [
  {
    tier: "Regular",
    price: 100,
    popular: false,
    modules: [
      { name: "Introduction", items: ["Bullish & Bearish structure", "Phases of market structure", "Pure & different structures", "Swing points", "Transition"] },
      { name: "Market Shift (BOS)", items: ["Validation & invalidation", "Types of BOS and how to mark them"] },
      { name: "Liquidity Engineering", items: ["Understanding LE", "LE and its types"] },
      { name: "Failed LE", items: ["Types of FLE"] },
      { name: "Formations", items: ["Inside & outside", "FiF"] },
      { name: "Flip Zones", items: ["Meaning and how to use FLZ", "MoC and IMB"] },
      { name: "Directional Bias", items: ["Timeframe coordination", "Shift coordination"] },
      { name: "Entry Types", items: ["Ent T1", "Ent T2"] },
    ],
  },
  {
    tier: "Advanced",
    price: 200,
    popular: true,
    modules: [
      { name: "Directional Bias", items: ["Timeframe coordination", "Shift coordination"] },
      { name: "Entry Types", items: ["Ent T1", "Ent T2", "Ent T3", "Ent T4", "Ent T5", "Ent T6", "Ent T7", "Ent T8"] },
      { name: "FTA & DTO", items: ["Complete FTA framework", "DTO scenarios"] },
      { name: "Liquidity Consumption", items: ["Possible AoC", "LWR + sub form", "Deviation"] },
      { name: "LTF Trading & TF Switching", items: ["Low timeframe execution", "Switching frameworks live"] },
      { name: "XAUUSD Trading", items: ["Session ALC", "Session INT"] },
      { name: "Top-Down Analysis", items: ["Full workflow"] },
    ],
  },
  {
    tier: "Masterclass",
    price: 300,
    popular: false,
    modules: [
      { name: "Introduction", items: ["Bullish & Bearish structure", "Phases", "Pure & different", "Swing points", "Transition"] },
      { name: "Market Shift (BOS)", items: ["Validation & invalidation", "Types of BOS"] },
      { name: "Liquidity Engineering", items: ["Understanding LE", "LE types"] },
      { name: "Failed LE", items: ["Types of FLE"] },
      { name: "Formations", items: ["Inside & outside", "FiF"] },
      { name: "Flip Zones", items: ["FLZ trading", "MoC and IMB"] },
      { name: "Directional Bias", items: ["TF coordination", "Shift coordination"] },
      { name: "Entry Types", items: ["Ent T1 through Ent T8"] },
      { name: "FTA & DTO", items: ["Framework and scenarios"] },
      { name: "Liquidity Consumption", items: ["Possible AoC", "LWR + sub form", "Deviation"] },
      { name: "LTF & TF Switching", items: ["Live execution playbook"] },
      { name: "XAUUSD Trading", items: ["Session ALC", "Session INT"] },
      { name: "Top-Down Analysis", items: ["End-to-end mastery"] },
    ],
  },
] as const;

export const FAQ = [
  { q: "Do I need prior trading experience?", a: "No. The Foundations track assumes zero experience and walks you from candles to full ALC execution." },
  { q: "How long do I keep access?", a: "Every course and mentorship tier includes lifetime access and all future updates to that curriculum." },
  { q: "What markets does ALC work on?", a: "The framework is instrument-agnostic. It's most commonly applied to forex majors and XAUUSD." },
  { q: "Which payment methods do you accept?", a: "Visa, Mastercard, Apple Pay and Google Pay. Mobile Money is enabled in selected regions." },
  { q: "Can I get a refund?", a: "Because content is unlocked instantly, sales are final. Preview free lessons before you buy." },
  { q: "Do you provide signals?", a: "No. BlackPips is strictly an education platform — we teach you to read the market yourself." },
];

export const TESTIMONIALS_DATA = [
  { name: "Adama K.", role: "Prop firm funded", quote: "The ALC framework rebuilt my whole read of the market. I passed my $100k challenge in three weeks." },
  { name: "Marcus T.", role: "Full-time trader", quote: "I've bought every course out there. BlackPips is the first one where the entries actually repeat." },
  { name: "Lina R.", role: "Part-time swing trader", quote: "The XAUUSD session material alone was worth ten times what I paid." },
  { name: "David O.", role: "New trader", quote: "Six months in and I finally understand what liquidity actually means. The videos are ridiculously well edited." },
];

export const BLOG_POSTS = [
  { slug: "reading-liquidity", title: "Reading Liquidity Like an Algorithm", category: "Liquidity", excerpt: "Where retail sees a wick, institutions see a harvest. Here's how to read the intent behind a liquidity sweep.", date: "2025-05-14" },
  { slug: "bos-vs-choch", title: "BOS vs CHoCH: What Actually Matters", category: "Market Structure", excerpt: "The terminology wars miss the point. Validation is what makes a shift tradable — not the label.", date: "2025-05-02" },
  { slug: "risk-of-ruin", title: "The Math Behind Risk of Ruin", category: "Risk Management", excerpt: "Why 1% per trade isn't a rule — it's a survival threshold derived from your win rate.", date: "2025-04-20" },
  { slug: "trading-the-open", title: "Trading the New York Open Cleanly", category: "News Analysis", excerpt: "A repeatable pre-NY checklist that keeps you out of the first-15-minute chop." },
  { slug: "journaling-that-works", title: "A Journal Format That Actually Compounds", category: "Trading Psychology", excerpt: "Screenshots aren't enough. This template turns every trade into a decision you can grade." },
  { slug: "xauusd-asia-play", title: "The Asia Session Gold Playbook", category: "Market Structure", excerpt: "How the Asian range sets up the London liquidity grab — and how to position for it." },
];
