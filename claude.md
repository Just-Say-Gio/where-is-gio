# CLAUDE.md - Where Is Gio

## Project Overview

**Where Is Gio** is a polished travel calendar website showing where Gio is (or will be) throughout 2026. It syncs with a Notion travel outline, uses Groq AI to parse unstructured notes into structured data AND generate monthly taglines, and displays a color-coded year calendar with rich tooltips, mobile drawers, travel stats, flight analytics, a 3D globe, and a country tracker.

**Live at:** `whereisgio.com`
**Repo:** `github.com/Just-Say-Gio/where-is-gio`

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework (App Router, ISR) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | Latest | UI components (tooltip, drawer, badge, card, popover) |
| MagicUI | Latest | Animations (blur-fade, number-ticker, magic-card, border-beam, animated-gradient-text, animated-shiny-text, marquee, text-reveal, animated-circular-progress-bar) |
| motion/react | Latest | Animation library (framer-motion successor) |
| three-globe + react-three-fiber | Latest | 3D flight globe visualization |
| Notion API | @notionhq/client 5.x | Data source — fetches travel schedule blocks |
| Groq SDK | 0.37.x | AI parsing + monthly insights (llama-3.3-70b-versatile, JSON mode) |
| Railway | -- | Hosting (Nixpacks, Node 20+) |

---

## Architecture

```
Notion Travel Page
        |
        v
  /admin -> "Sync from Notion" button
        |
        v
  Notion API (paginated block fetch)
        |
        v
  Groq AI #1: Parse segments (temp 0.1)
  Groq AI #2: Generate 12 monthly taglines (temp 0.8, context-rich)
        |
        v
  File cache (.cache/segments.json) — includes segments + monthInsights
        |
        v
  Server component reads cache -> renders calendar
```

**Key design decision:** The main page never calls Groq directly. All AI calls happen during `/api/sync` (triggered from `/admin`). This prevents 429 rate limit errors from crashing the site. Monthly insights are backfilled on sync if missing from cache.

---

## Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Dynamic (SSR) | Main calendar with 4 sections: calendar, stats, flights, countries |
| `/when-can-I-stay` | Dynamic (SSR) | Public page showing Thailand availability for hosting |
| `/admin` | Static | Sync button, cache status, sync logs with step timing |
| `/admin/hosting` | Static | Interactive calendar to mark Thailand dates as unavailable |
| `/api/sync` | API | Notion fetch + Groq parse + AI insights, step-by-step results |
| `/api/sync/status` | API | Current cache status (last synced, segment count) |
| `/api/segments` | API | Cached travel segments as JSON |
| `/api/flights` | API | Flight analytics from CSV |
| `/api/hosting` | API | GET/POST/DELETE for hosting availability overrides |

---

## Component Architecture

```
page.tsx (Server) — reads cache, passes data down
  |
  CalendarWrapper (Client boundary)
  |-- Header — current location + next trip countdown + timezone display (MagicCard, AnimatedGradientText)
  |   |-- TimezoneDisplay — live clocks for Gio + visitor, time difference, click-to-open meeting planner
  |   |-- MeetingPlanner — Popover (desktop) / Drawer (mobile) with 24h hour grid, best window recommendation
  |-- CalendarLayoutToggle — mobile-only animated 2col/1col toggle with motion layoutId pill
  |-- YearCalendar — responsive grid (2col/1col mobile, 3col sm, 4col lg) with motion.div layout animation
  |   |-- MonthGrid x12 — always-on stats (countries, days abroad, tz switches) + AI tagline, week numbers
  |       |-- DayCell — forwardRef for Radix, status indicators, rich tooltips/mobile drawers
  |-- Legend — sorted by day count, click-to-highlight with colored glow
  |-- CountryStats — 2026 bento stats (AI badge, metrics, MagicCard grid, distribution bar, marquee)
  |-- TextReveal — scroll-driven word-by-word transition to historic section
  |-- FlightStats — all-time flight analytics (BlurFade, CircularProgressBar, MagicCard bento, route marquee)
  |-- FlightMap — 3D globe with chronological flight arcs + camera tracking (frosted overlays)
  |-- CountryTracker — all-time visited countries (CircularProgressBar hero, MagicCard regions, flag marquee)
  |-- Scratch Map — embedded Skratch.world iframe
```

---

## Key Features

### Calendar
- **Year-at-a-glance** with country-colored cells and flag emojis in a card wrapper
- **Per-month stats + taglines** — every month always shows: country count, days in/out of Thailand, and timezone switches (e.g., "6 countries · 24d abroad · 5 tz", "1 country · all home"). Uses `TZ_OFFSETS` map for approximate UTC offsets per country. AI-generated taglines from Groq shown below as witty context (e.g., "six flags chaos", "prague again already", "hua hin hibernation")
- **Rich tooltips** (desktop) — colored accent strip, flag, city, date range, duration, status badge, notes
- **Mobile drawers** (touch) — Vaul-based bottom sheet with full trip details on tap
- **Segment status indicators** — diagonal stripes (tentative), dashed border (transit), 60% opacity (option)
- **Past dates** are always shown as confirmed regardless of original status
- **Staggered month entrance** — each month animates in with BlurFade (50ms stagger)
- **Scroll-to-today** — auto-scrolls on load + floating "Today" button (bottom-right, pulsing dot)
- **Interactive legend** — countries sorted by day count, click to highlight/dim, active glow
- **Mobile layout toggle** — elegant animated toggle (mobile-only, `sm:hidden`) to switch between 2-column (compact 22px cells) and 1-column (expanded 32px cells) layout. Uses `motion/react` `layoutId` for sliding pill indicator + `motion.div layout` for smooth grid reflow. Persists choice in localStorage

### Header
- **AnimatedGradientText** title with MagicUI
- **MagicCard** for current location with pulsing indicator
- **NumberTicker** for countdown to next trip
- **Timezone display** — shows Gio's local time (IANA-based, DST-aware), visitor's time, and signed offset (e.g., "+12h"). "Same timezone!" when equal. Clickable to open meeting planner
- **Meeting planner** — Popover on desktop, Drawer on mobile. Shows 24-hour color-coded grid (green=good 9-17, amber=okay 7-8/18-20, gray=bad), best meeting window recommendation, and grouped time ranges. Uses `Intl.DateTimeFormat` for live DST-aware offsets. 60s tick keeps times fresh

### Stats & Flights
- **Country stats** — bento layout: AI personality badge (AnimatedShinyText), key metrics with NumberTicker, MagicCard grid (circular progress, trip/month counts, confirmation %), country distribution bar (proportional + 70/30 hover expand), destination marquee
- **Scroll-reveal transition** — MagicUI TextReveal between 2026 stats and historic sections. Words fade in on scroll: "That was just 2026. Gio has been collecting passport stamps since 2022 — here is the full damage report."
- **Flight log** — BlurFade scroll reveals, top metrics with NumberTicker, MagicCard fact cards, AnimatedCircularProgressBar for business/leisure split, cabin & duration MagicCard, gradient year bars, route marquee
- **3D globe** — Aceternity globe with chronological flight arcs + auto-tracking camera, frosted glass year legend pills and stats overlay
- **Country tracker** — AnimatedCircularProgressBar hero (27% world) in MagicCard, regional breakdown in MagicCard with gradient bars, country flag marquee, AnimatedShinyText "best explored region" badge

### Other
- **Dark mode** with localStorage persistence and flash prevention
- **Friends-only auth gate** — 3-step quiz (Skoda -> Verstappen -> France joke)
- **Hosting availability** (`/when-can-I-stay`)

---

## File Structure

```
where-is-gio/
├── CLAUDE.md
├── .env.local                    # API keys (gitignored)
├── .node-version                 # Node 20 for Railway
├── railway.json                  # Build/start config
├── hosting-overrides.json        # Committed hosting data (survives deploys)
├── data/flights.csv              # Flight history data
├── data/visited-countries.json   # All-time visited countries
├── instrumentation.ts            # Next.js startup hook: auto-warms caches
│
├── app/
│   ├── layout.tsx                # Root layout, Geist font, dark mode
│   ├── page.tsx                  # Server component: reads cache, renders CalendarWrapper
│   ├── globals.css               # Tailwind v4 + shadcn vars + custom animations
│   └── api/sync/route.ts         # Notion + Groq parse + AI monthly insights
│
├── components/
│   ├── ui/                       # shadcn + MagicUI components (15 files)
│   │   ├── animated-circular-progress-bar.tsx  # Animated progress ring
│   │   ├── animated-gradient-text.tsx          # MagicUI gradient text
│   │   ├── animated-shiny-text.tsx             # MagicUI shiny text
│   │   ├── blur-fade.tsx                       # MagicUI scroll reveal
│   │   ├── border-beam.tsx                     # MagicUI animated border
│   │   ├── globe.tsx                           # Aceternity 3D globe + CameraTracker
│   │   ├── magic-card.tsx                      # MagicUI spotlight card
│   │   ├── marquee.tsx                         # MagicUI marquee/carousel
│   │   ├── number-ticker.tsx                   # MagicUI counting animation
│   │   ├── text-reveal.tsx                     # MagicUI scroll-driven text reveal
│   │   └── (badge, card, drawer, popover, tooltip).tsx  # shadcn/ui primitives
│   ├── calendar-wrapper.tsx      # Client boundary: state, scroll, sections
│   ├── header.tsx                # Current location + countdown + timezone (MagicCard)
│   ├── timezone-display.tsx      # Live timezone comparison widget (clickable)
│   ├── meeting-planner.tsx       # Meeting planner Popover/Drawer with hour grid
│   ├── calendar-layout-toggle.tsx # Mobile-only 2col/1col toggle with motion layoutId
│   ├── year-calendar.tsx         # 12-month grid with motion.div layout animation
│   ├── month-grid.tsx            # Month with always-on stats (countries/abroad/tz) + AI tagline, week numbers
│   ├── day-cell.tsx              # forwardRef cell: tooltips, drawers, status indicators
│   ├── legend.tsx                # Country pills with day counts, click highlight
│   ├── country-stats.tsx         # 2026 bento stats (AI badge, metrics, distribution bar, marquee)
│   ├── flight-stats.tsx          # Flight analytics (BlurFade, CircularProgressBar, MagicCard bento, route marquee)
│   ├── flight-map.tsx            # 3D globe with BorderBeam + flight arcs + camera tracking + frosted overlays
│   ├── country-tracker.tsx       # All-time visited countries (CircularProgressBar, MagicCard, flag marquee)
│   ├── auth-gate.tsx             # Friends-only quiz gate
│   ├── admin-pin-gate.tsx        # PIN-based admin authentication
│   ├── when-calendar.tsx         # Thailand hosting availability calendar
│   └── theme-toggle.tsx          # Dark/light mode toggle
│
├── lib/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── utils.ts                  # Utility helpers (cn class merger)
│   ├── ai-parser.ts              # Groq: segment parsing + monthly insights
│   ├── cache.ts                  # File cache (.cache/segments.json)
│   ├── calendar-utils.ts         # Date gen, segment assignment, week numbers
│   ├── timezone.ts               # Shared TZ utilities: offsets, IANA map, meeting grid logic
│   ├── countries.ts              # Country -> color/flag mapping
│   ├── notion.ts                 # Notion API block fetching with pagination
│   ├── flights-parser.ts         # CSV parsing, flight analytics
│   ├── flights-cache.ts          # Flight analytics cache
│   ├── airport-coords.ts         # Lat/lng for 37+ airports
│   ├── city-country-map.ts       # City → country code mapping for flights
│   └── hosting.ts                # Hosting overrides (committed JSON)
│
├── hooks/
│   └── use-is-mobile.ts          # Shared hook: pointer:coarse media query
│
└── .cache/                       # Gitignored runtime cache
    └── segments.json             # Travel data + monthInsights from sync
```

---

## Caching Strategy

| File | Contents | Updated by |
|------|----------|-----------|
| `.cache/segments.json` | Travel segments + AI monthly insights | `/api/sync` |
| `hosting-overrides.json` | Hosting unavailability (committed) | `/admin/hosting` |
| `.cache/flights-cache.json` | Parsed flight analytics | Auto on first read |

The main page only reads from cache. After each Railway deploy, visit `/admin` to re-sync (cache is ephemeral). `instrumentation.ts` auto-warms flight + Notion caches on startup.

---

## AI Integration (Groq)

Two Groq calls during sync:

1. **Segment parser** (temp 0.1) — Parses raw Notion text into `TravelSegment[]`
2. **Monthly insights** (temp 0.8) — Generates 12 witty, context-aware taglines. The `buildMonthContext()` function pre-computes per-month summaries (countries with cities, travel days, home days, tentative flags) so the AI gets rich context. Examples: "six flags chaos" (6-country month), "prague again already" (repeat destination), "hua hin hibernation" (home month).

Insights are cached in `segments.json` alongside segments. If segments are unchanged but insights are missing, sync backfills them without re-parsing segments.

**Month header display:** Each month always shows two lines:
- **Line 1 (inline):** Three stats next to month name — country count, days abroad (or "all home"/"all abroad"), and timezone switches (if > 0). Joined by " · ". Uses shared `TZ_OFFSETS` map from `lib/timezone.ts` for approximate UTC offsets. Days without a segment default to Thailand (home base).
- **Line 2 (below):** AI tagline in italic — shown for ALL months, providing personality alongside the data.

---

## Environment Variables

```env
NOTION_API_KEY=           # Notion integration token
NOTION_PAGE_ID=           # Travel outline page ID
GROQ_API_KEY=             # Groq API key (free tier)
SYNC_INTERVAL_HOURS=6     # Cache TTL in hours
```

---

## Deployment

1. Push to `github.com/Just-Say-Gio/where-is-gio`
2. Railway auto-deploys from `main` branch
3. After deploy: visit `/admin` -> click "Sync from Notion"
4. Custom domain: `whereisgio.com`

**Note:** Railway containers are ephemeral — `.cache/` is wiped on each deploy. Re-sync from `/admin` after every deployment. `hosting-overrides.json` is committed to git and survives deploys.
