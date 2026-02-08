# CLAUDE.md - Where Is Gio

## Project Overview

**Where Is Gio** is a polished travel calendar website showing where Gio is (or will be) throughout 2026. It syncs with a Notion travel outline, uses Groq AI to parse unstructured notes into structured data AND generate monthly taglines, and displays a color-coded year calendar with rich tooltips, mobile drawers, travel stats, flight analytics, a 3D globe, a country tracker, and a full Google Maps movement history dashboard with photo heatmap.

**Live at:** `whereisgio.com`
**Repo:** `github.com/Just-Say-Gio/where-is-gio`

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework (App Router, ISR) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | Latest | UI components (tooltip, drawer, badge, card, popover, tabs, chart) |
| MagicUI | Latest | Animations (blur-fade, number-ticker, magic-card, border-beam, animated-gradient-text, animated-shiny-text, marquee, text-reveal, animated-circular-progress-bar) |
| motion/react | Latest | Animation library (framer-motion successor) |
| three-globe + react-three-fiber | Latest | 3D flight globe visualization |
| Leaflet + react-leaflet | Latest | 2D interactive heatmap with photo/review markers |
| leaflet.heat | 0.2.x | Heat layer plugin for Leaflet |
| Notion API | @notionhq/client 5.x | Data source — fetches travel schedule blocks |
| Groq SDK | 0.37.x | AI parsing + monthly insights + maps analytics (llama-3.3-70b-versatile, JSON mode) |
| Prisma | 5.x | ORM for PostgreSQL analytics (page views, API calls, chat logs, events) |
| Recharts | 2.x | Charts for admin analytics dashboard (area, bar, pie) |
| sharp | 0.34.x | Image resizing (CLI script, devDependency) |
| Railway | -- | Hosting (Nixpacks, Node 20+) + PostgreSQL database |

---

## Architecture

### Calendar Data Flow (Notion → Calendar)

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

### Google Maps Data Flow (Takeout → Maps Dashboard)

```
Google Maps Takeout (raw, gitignored)
  ├── Timeline (2).json          (233MB, 58,892 segments)
  ├── Takeout/Maps/Reviews.json  (638 reviews)
  └── Takeout/Maps/Photos and videos/*.json  (2,986 photos)
        |
        v
  CLI: npx tsx scripts/process-maps-data.ts [--insights] [--heatmap]
        |
        ├── processTimeline()     → visits, activities, distance by 13 modes, records
        ├── processReviews()      → ratings, countries, distribution
        ├── processPhotos()       → geotagged count, date ranges, by-year
        ├── coordToCountry()      → ISO-2 country codes per visit (bbox lookup)
        ├── generateInsights()    → Groq AI: 10 categorized travel insights
        └── extractHeatmapData()  → grid cells, top photos, review coordinates
        |
        v
  data/maps-stats.json           (aggregated stats, committed)
  data/maps-heatmap.json          (heat cells + photo/review coords, committed)
  public/photos/heatmap/*.jpg     (488 resized thumbnails, committed)
        |
        v
  Server reads JSON → CalendarWrapper → MapsStats + PhotoHeatmap components
```

**Privacy:** Raw GPS coordinates and placeIds are only used during aggregation and never stored. Visit coordinates are rounded to 1 decimal (~11km grid) for heatmap. HOME/WORK semantic visits are excluded entirely.

---

## Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Dynamic (SSR) | Main page: calendar, stats, flights, countries, maps dashboard, heatmap |
| `/when-can-I-stay` | Dynamic (SSR) | Public page showing Thailand availability for hosting |
| `/admin` | Static | Sync button, cache status, sync logs with step timing |
| `/admin/analytics` | Static | Analytics dashboard — traffic charts, device/country breakdown, chat logs, events |
| `/admin/hosting` | Static | Interactive calendar to mark Thailand dates as unavailable |
| `/api/sync` | API | Notion fetch + Groq parse + AI insights, step-by-step results |
| `/api/sync/status` | API | Current cache status (last synced, segment count) |
| `/api/segments` | API | Cached travel segments as JSON |
| `/api/flights` | API | Flight analytics from CSV |
| `/api/hosting` | API | GET/POST/DELETE for hosting availability overrides |
| `/api/chat` | API (POST) | AI chatbot — Groq streaming + IP rate limiting (10/day) |
| `/api/rice-runs` | API | GET/POST/DELETE for charity rice run dates |
| `/api/maps-stats` | API | Returns `data/maps-stats.json` |
| `/api/maps-stats/insights` | API (POST) | Generates AI insights via Groq, writes to maps-stats.json |
| `/api/analytics/pageview` | API (POST) | Logs page views to PostgreSQL (fire-and-forget) |
| `/api/analytics/event` | API (POST) | Logs custom analytics events to PostgreSQL |
| `/api/admin/analytics` | API | Dashboard data: KPIs, trends, device/country breakdown, recent visitors |
| `/api/admin/analytics/chats` | API | Chat session list + individual conversation threads |

---

## Component Architecture

```
page.tsx (Server) — reads cache + JSON files, passes data down
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
  |-- CharityRiceBanner — MagicCard with AnimatedShinyText, charity rice runs info + next run date
  |-- CountryStats — 2026 bento stats (AI badge, metrics, MagicCard grid, distribution bar, marquee)
  |-- TextReveal x2 — scroll-driven word reveals between sections
  |-- GioLocator — rAF sweep-reactive radar with IP geolocation + haversine distance
  |-- FlightStats — all-time flight analytics (BlurFade, CircularProgressBar, MagicCard bento, route marquee)
  |-- FlightMap — 3D globe with chronological flight arcs + camera tracking (frosted overlays)
  |-- CountryTracker — all-time visited countries (CircularProgressBar hero, MagicCard regions, flag marquee)
  |-- MapsStats — Google Maps movement history dashboard (13 years, 758k km)
  |   |-- Hero metrics — total km, unique places, visits, years (NumberTicker)
  |   |-- Air vs Ground — AnimatedCircularProgressBar
  |   |-- Distance by mode — top 6 transport modes with icons
  |   |-- Record cards — busiest year, longest flight, most active day
  |   |-- Year-by-year grid — MagicCard per year with flags, 70/30 transport bar, 6-stat grid
  |   |-- Reviews — total, avg rating, distribution by country + rating stars
  |   |-- Photos summary — geotagged count, date range
  |   |-- AI Deep Analysis — 10 insights in 5 categories (personality/evolution/patterns/scale/deep cuts)
  |   |-- Monthly marquee — top 20 months by km
  |-- PhotoHeatmap — Leaflet world map with heat layer + photo/review markers
  |   |-- HeatmapMap (dynamic import, SSR: false) — Leaflet + leaflet.heat
  |-- Scratch Map — embedded Skratch.world iframe
  |-- ChatWidget — AI chatbot: floating panel (desktop) / Drawer (mobile), Groq streaming
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
- **Scroll-to-today** — auto-scrolls on load + "Jump to today" link in chat widget header
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
- **GioLocator** — Immersive radar-style distance widget between 2026 stats and historic sections (framed by TextReveal scroll transitions). Visitor ("You") at center, Gio as positioned blip colored by country accent. rAF-driven sweep (5s rotation) with two conic-gradient layers: sharp leading edge + wider phosphor afterglow trail. Blip is sweep-reactive — angular delta between sweep angle and blip bearing drives opacity (0.25 baseline → 1.0 when swept), glow size (0-20px box-shadow), outer blur ring, label opacity, and connection line strokeOpacity; all with 0.3s ease transitions. 5 range rings, compass labels (N/E/S/W), 72 tick marks, diagonal crosshairs, dashed SVG connection line. Gio's location from `currentSegment` via `city-coords.ts`. Visitor from IP geolocation (`ipapi.co/json`). Distance shown with NumberTicker (4xl-6xl). MagicCard wrapper with country-accent gradient. Graceful fallback if IP API blocked.
- **Flight log** — BlurFade scroll reveals, top metrics with NumberTicker, MagicCard fact cards, AnimatedCircularProgressBar for business/leisure split, cabin & duration MagicCard, gradient year bars, route marquee
- **3D globe** — Aceternity globe with chronological flight arcs + auto-tracking camera, frosted glass year legend pills and stats overlay
- **Country tracker** — AnimatedCircularProgressBar hero (27% world) in MagicCard, regional breakdown in MagicCard with gradient bars, country flag marquee, AnimatedShinyText "best explored region" badge

### Google Maps Movement History
- **MapsStats dashboard** — comprehensive analytics from 13 years (2014-2026) of Google Maps Timeline data
  - **Hero metrics**: 758,189 km total, 5,190 unique places, 18,851 visits, 13 years
  - **Air vs Ground**: AnimatedCircularProgressBar (55% flying)
  - **Distance by mode**: 13 transport modes — flying, driving, train, motorcycling, ferry, walking, cycling, bus, subway, running, tram, skiing, other
  - **Record cards**: Busiest year (2018), longest flight, most active day
  - **Year-by-year cards**: Each year as MagicCard with country flags (tooltips), 70/30 hover-expanding transport mode bar, 6-stat grid (places, days, km/d, timezones, trips, top mode)
  - **Reviews**: 638 reviews across 26 countries, 4.85 avg rating, breakdown by country + star distribution
  - **AI Deep Analysis**: 10 Groq-generated insights in 5 categories — Travel Personality, Evolution, Hidden Patterns, Scale & Comparisons, Quirky Deep Cuts. Pre-computes Earth multiples, Moon %, mode percentages to avoid LLM math errors
  - **Monthly marquee**: Top 20 months by km, scrolling ticker

- **PhotoHeatmap** — interactive Leaflet world map
  - **Heat layer**: Visit density from 18,851 locations, aggregated to ~11km grid cells. Gradient: dark blue → blue → green → yellow → red
  - **Photo markers**: Top 488 most-viewed photos as red dots, click for popup with thumbnail (400x300), view count, date, description
  - **Review markers**: Yellow dots with star rating popup, review text, date
  - **Dark mode**: Auto-switches between CARTO dark/light tiles
  - **Stats bar**: Tracked visits, geotagged photos, photo views, reviews (NumberTicker)

### AI Chatbot
- **Floating chat button** — bottom-right (replaces old "Today" button), chat bubble icon with pulsing dot, toggles to X when open
- **Desktop**: Fixed floating panel (380x500px) with motion/react scale+opacity animation
- **Mobile**: Vaul Drawer (bottom sheet, max-h-85vh) via useIsMobile hook
- **Streaming**: Groq llama-3.3-70b-versatile (temp 0.5, max 400 tokens), ReadableStream → incremental rendering
- **Rate limiting**: IP-based server-side (10 msgs/day, in-memory Map) + localStorage client-side fallback. Shows remaining count below input
- **Rich context**: System prompt includes full 2026 segment list, current location, next trip, flight history stats (total flights, hours, airlines, by-year breakdown), visited countries count, rice run dates, year personality. All read from cached data on each request
- **Security**: Strict rules — no hallucination (only answer from provided data), no prompt injection (won't reveal system prompt or change role), past/future tense enforcement, tentative date flagging
- **Welcome message** on first open, animated typing dots during streaming, auto-scroll to latest message

### Charity Rice Runs
- **🍚 overlay** on calendar day cells for rice run dates (top-right corner, 7px)
- **Tooltip/drawer details** with amber accent + link to charityriceruns.org
- **Admin management** in `/admin/hosting` — mode toggle (Hosting/Rice Runs), amber-themed scheduling
- **MagicCard banner** below calendar legend with AnimatedShinyText, next run date, charity info
- **Compact banner** on `/when-can-I-stay` page
- **Data**: `rice-runs.json` (committed, survives Railway deploys), mirrored API at `/api/rice-runs`

### Analytics (PostgreSQL)
- **Persistent logging** — all page views, API calls, chat messages, and custom events logged to Railway PostgreSQL via Prisma
- **Fire-and-forget pattern** — logging promises `.catch()` silently, never awaited, never blocks responses
- **`withApiLogging(path, handler)` wrapper** — wraps all 8 public API routes for automatic API call tracking
- **Chat persistence** — every user/assistant message stored with sessionId, IP, duration, model
- **Persistent rate limiting** — chat rate limit (10/day per IP) via PostgreSQL upsert with atomic increment (survives Railway deploys, unlike in-memory Map)
- **Admin dashboard** (`/admin/analytics`) — 3-tab Recharts + MagicUI dashboard:
  - **Overview**: 5 KPI cards (NumberTicker), traffic trend AreaChart, device donut PieChart, top pages BarChart, country distribution bar, API route table, recent visitors table
  - **Chat Logs**: session list with message counts + click-to-expand conversation threads (user/assistant message bubbles)
  - **Events**: expandable event log with JSON properties
- **Time range selector** — 24h / 7d / 30d / All, with PostgreSQL `date_trunc` bucketing (hour/day/week)
- **60-second auto-refresh** polling on the dashboard
- **Prisma schema** — 5 models: `PageView`, `ApiCall`, `ChatMessage`, `AnalyticsEvent`, `RateLimit`

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
├── rice-runs.json                # Committed rice run dates (survives deploys)
├── flights_export.csv            # Flight history data (committed)
├── visited-countries.json        # All-time visited countries (committed)
├── instrumentation.ts            # Next.js startup hook: auto-warms caches
│
├── data/
│   ├── globe.json                # 3D globe country geometry
│   ├── maps-stats.json           # Aggregated Maps analytics (committed, no GPS)
│   └── maps-heatmap.json         # Heatmap grid + photo/review coords (committed)
│
├── scripts/
│   └── process-maps-data.ts      # CLI: processes Google Maps Takeout → stats + heatmap
│
├── prisma/
│   └── schema.prisma             # 5 models: PageView, ApiCall, ChatMessage, AnalyticsEvent, RateLimit
│
├── app/
│   ├── layout.tsx                # Root layout, Geist font, dark mode
│   ├── page.tsx                  # Server component: reads cache + JSON, renders CalendarWrapper
│   ├── globals.css               # Tailwind v4 + shadcn vars + Leaflet overrides + custom animations
│   ├── admin/analytics/page.tsx  # Analytics dashboard: Recharts charts + MagicUI cards, 3 tabs
│   ├── api/sync/route.ts         # Notion + Groq parse + AI monthly insights
│   ├── api/chat/route.ts         # AI chatbot: Groq streaming + persistent rate limiting + travel context
│   ├── api/rice-runs/route.ts    # GET/POST/DELETE for rice run dates
│   ├── api/maps-stats/route.ts   # GET: returns maps-stats.json
│   ├── api/maps-stats/insights/route.ts  # POST: generates Groq insights, updates JSON
│   ├── api/analytics/pageview/route.ts   # POST: logs page views to PostgreSQL
│   ├── api/analytics/event/route.ts      # POST: logs custom events to PostgreSQL
│   ├── api/admin/analytics/route.ts      # GET: dashboard data (KPIs, trends, breakdowns)
│   └── api/admin/analytics/chats/route.ts # GET: chat sessions + conversation threads
│
├── components/
│   ├── ui/                       # shadcn + MagicUI components (23 files)
│   │   ├── animated-circular-progress-bar.tsx  # Animated progress ring
│   │   ├── animated-gradient-text.tsx          # MagicUI gradient text
│   │   ├── animated-shiny-text.tsx             # MagicUI shiny text
│   │   ├── blur-fade.tsx                       # MagicUI scroll reveal
│   │   ├── border-beam.tsx                     # MagicUI animated border
│   │   ├── chart.tsx                           # shadcn chart: ChartContainer + ChartTooltip (Recharts wrapper)
│   │   ├── globe.tsx                           # Aceternity 3D globe + CameraTracker
│   │   ├── magic-card.tsx                      # MagicUI spotlight card
│   │   ├── marquee.tsx                         # MagicUI marquee/carousel
│   │   ├── number-ticker.tsx                   # MagicUI counting animation
│   │   ├── tabs.tsx                            # shadcn tabs (Radix)
│   │   ├── text-reveal.tsx                     # MagicUI scroll-driven text reveal
│   │   └── (badge, button, card, drawer, popover, scroll-area, textarea, tooltip).tsx  # shadcn/ui primitives
│   ├── calendar-wrapper.tsx      # Client boundary: state, scroll, all sections, chat toggle
│   ├── chat-widget.tsx           # AI chatbot: floating panel (desktop) + Drawer (mobile) + streaming
│   ├── charity-rice-banner.tsx   # MagicCard banner: rice runs charity info + next run date
│   ├── header.tsx                # Current location + countdown + timezone (MagicCard)
│   ├── timezone-display.tsx      # Live timezone comparison widget (clickable)
│   ├── meeting-planner.tsx       # Meeting planner Popover/Drawer with hour grid
│   ├── calendar-layout-toggle.tsx # Mobile-only 2col/1col toggle with motion layoutId
│   ├── year-calendar.tsx         # 12-month grid with motion.div layout animation
│   ├── month-grid.tsx            # Month with always-on stats (countries/abroad/tz) + AI tagline, week numbers
│   ├── day-cell.tsx              # forwardRef cell: tooltips, drawers, status indicators
│   ├── legend.tsx                # Country pills with day counts, click highlight
│   ├── country-stats.tsx         # 2026 bento stats (AI badge, metrics, distribution bar, marquee)
│   ├── gio-locator.tsx           # rAF sweep-reactive radar (IP geolocation, haversine, accent-colored)
│   ├── flight-stats.tsx          # Flight analytics (BlurFade, CircularProgressBar, MagicCard bento, route marquee)
│   ├── flight-map.tsx            # 3D globe with BorderBeam + flight arcs + camera tracking + frosted overlays
│   ├── country-tracker.tsx       # All-time visited countries (CircularProgressBar, MagicCard, flag marquee)
│   ├── maps-stats.tsx            # Google Maps movement history dashboard (year cards, transport bars, AI insights)
│   ├── photo-heatmap.tsx         # Leaflet heatmap wrapper (stats bar + dynamic map import)
│   ├── heatmap-map.tsx           # Leaflet map: heat layer + photo markers + review markers
│   ├── auth-gate.tsx             # Friends-only quiz gate
│   ├── admin-pin-gate.tsx        # PIN-based admin authentication
│   ├── when-calendar.tsx         # Thailand hosting availability calendar
│   └── theme-toggle.tsx          # Dark/light mode toggle
│
├── lib/
│   ├── types.ts                  # All TypeScript interfaces (TravelSegment, FlightRecord, MapsStatsData, HeatmapData, etc.)
│   ├── utils.ts                  # Utility helpers (cn class merger)
│   ├── ai-parser.ts              # Groq: segment parsing + monthly insights
│   ├── cache.ts                  # File cache (.cache/segments.json)
│   ├── calendar-utils.ts         # Date gen, segment assignment, week numbers
│   ├── timezone.ts               # Shared TZ utilities: offsets, IANA map, meeting grid logic
│   ├── countries.ts              # Country code → name/color/flag mapping (61 countries, no fallback gaps)
│   ├── country-bbox.ts           # Coordinate → ISO-2 country code lookup (bounding boxes + US/CA border)
│   ├── notion.ts                 # Notion API block fetching with pagination
│   ├── flights-parser.ts         # CSV parsing, flight analytics
│   ├── flights-cache.ts          # Flight analytics cache
│   ├── airport-coords.ts         # Lat/lng for 37+ airports
│   ├── city-country-map.ts       # City → country code mapping for flights
│   ├── city-coords.ts            # City/country → [lat, lng] mapping for GioLocator
│   ├── timeline-parser.ts        # Google Maps Timeline processor (visits, activities, distance, reviews, photos, heatmap)
│   ├── leaflet-heat.d.ts         # Type shim for leaflet.heat (no @types package)
│   ├── hosting.ts                # Hosting overrides (committed JSON)
│   ├── rice-runs.ts              # Rice run dates (committed JSON, mirrors hosting.ts)
│   ├── prisma.ts                 # Singleton Prisma client (global dev cache)
│   └── analytics.ts              # Fire-and-forget helpers: logPageView, logApiCall, logChatMessage, logEvent, withApiLogging
│
├── hooks/
│   └── use-is-mobile.ts          # Shared hook: pointer:coarse media query
│
├── public/
│   └── photos/heatmap/           # 488 resized photo thumbnails (400x300 JPEG)
│
└── .cache/                       # Gitignored runtime cache
    └── segments.json             # Travel data + monthInsights from sync
```

---

## Caching & Data Strategy

| File | Contents | Updated by | Persists deploys? |
|------|----------|-----------|-------------------|
| `.cache/segments.json` | Travel segments + AI monthly insights | `/api/sync` | No (ephemeral) |
| `hosting-overrides.json` | Hosting unavailability | `/admin/hosting` | Yes (committed) |
| `rice-runs.json` | Charity rice run dates | `/admin/hosting` + `/api/rice-runs` | Yes (committed) |
| `.cache/flights-cache.json` | Parsed flight analytics | Auto on first read | No (ephemeral) |
| `data/maps-stats.json` | Aggregated Maps analytics + AI insights | CLI script | Yes (committed) |
| `data/maps-heatmap.json` | Heatmap grid + photo/review coords | CLI script | Yes (committed) |
| `public/photos/heatmap/*.jpg` | 488 photo thumbnails | CLI script | Yes (committed) |

The main page only reads from cache/JSON. After each Railway deploy, visit `/admin` to re-sync Notion data (cache is ephemeral). Maps data is committed to git and survives deploys. `instrumentation.ts` auto-warms flight + Notion caches on startup.

---

## AI Integration (Groq)

### 1. Segment Parser (Notion sync)
- **Model:** llama-3.3-70b-versatile, temp 0.1
- Parses raw Notion text into `TravelSegment[]`

### 2. Monthly Insights (Notion sync)
- **Model:** llama-3.3-70b-versatile, temp 0.8
- Generates 12 witty, context-aware taglines per month
- `buildMonthContext()` pre-computes per-month summaries (countries with cities, travel days, home days, tentative flags) so the AI gets rich context
- Cached in `segments.json` alongside segments. Backfilled on sync if missing.

### 4. AI Chatbot (`/api/chat`)
- **Model:** llama-3.3-70b-versatile, temp 0.5, max 400 tokens, streaming
- Conversational assistant for travel questions — answers about Gio's schedule, flights, countries
- System prompt dynamically built per request from: cached segments, flight analytics, visited countries, rice run dates, year personality summary
- Strict guardrails: no hallucination (only answers from provided data), no prompt injection, tentative date flagging, past/future tense
- Rate limited: 10 messages per IP per 24h (in-memory Map, resets on deploy)
- Conversation history: last 8 exchanges sent with each request for context continuity

### 5. Maps Analytics Insights (CLI script)
- **Model:** llama-3.3-70b-versatile, temp 0.6
- Generates exactly 10 insights across 5 categories:
  1. **Travel Personality** (2) — archetype analysis, explorer vs revisiter
  2. **Evolution** (2) — inflection years, geographic shifts (NL→TH)
  3. **Hidden Patterns** (2) — transport mode shifts, review behavior, motorcycle obsession
  4. **Scale & Comparisons** (2) — Earth circumferences, Moon distance, tangible route comparisons
  5. **Quirky Deep Cuts** (2) — outlier years, extreme ratios, unexpected stats
- Pre-computes key facts (Earth multiples, Moon %, mode percentages, peak/quietest year) to avoid LLM math errors
- Includes Gio's background context (Dutch, Thailand-based digital nomad, motorcycle rider)
- Style: "data journalist, not travel blogger" — max 2 sentences per insight, specific numbers, no exclamation marks

**Month header display:** Each month always shows two lines:
- **Line 1 (inline):** Three stats next to month name — country count, days abroad (or "all home"/"all abroad"), and timezone switches (if > 0). Joined by " · ". Uses shared `TZ_OFFSETS` map from `lib/timezone.ts` for approximate UTC offsets. Days without a segment default to Thailand (home base).
- **Line 2 (below):** AI tagline in italic — shown for ALL months, providing personality alongside the data.

---

## CLI Script: `scripts/process-maps-data.ts`

Processes Google Maps Takeout exports into committed data files.

```bash
npx tsx scripts/process-maps-data.ts              # Basic: timeline + reviews + photos
npx tsx scripts/process-maps-data.ts --insights   # + AI insights via Groq
npx tsx scripts/process-maps-data.ts --heatmap    # + heatmap JSON + photo thumbnails (sharp)
```

**Input files (gitignored, raw GPS):**
- `Timeline (2).json` — 233MB phone export with `semanticSegments`
- `Takeout/Maps (your places)/Reviews.json` — Google Maps reviews
- `Takeout/Maps/Photos and videos/*.json` — Photo metadata sidecars

**Output files (committed, safe):**
- `data/maps-stats.json` — Aggregated stats (no GPS coords/placeIds)
- `data/maps-heatmap.json` — Heat grid cells + photo/review coords
- `public/photos/heatmap/*.jpg` — 488 resized thumbnails (400x300, 80% JPEG via sharp)

**Key processing steps:**
1. Parse 58,892 timeline segments → 18,851 visits, 17,863 activities, 758,189 km across 13 modes
2. Coordinate → country lookup via `country-bbox.ts` (bounding boxes + US/CA border piecewise function)
3. Aggregate per year: visits, km, places, trips, timezones, countries, transport mode breakdown
4. Reviews: 638 total across 26 countries, rating distribution
5. Photos: 2,939 geotagged, sorted by `imageViews` for top photos
6. Heatmap: Round visit coords to 1 decimal (~11km grid), skip HOME/WORK visits

---

## Key Modules

### `lib/country-bbox.ts` — Coordinate → Country Lookup
- ~107 bounding boxes covering countries worldwide
- Each bbox: `[code, minLat, maxLat, minLng, maxLng, centLat, centLng]`
- **US/Canada special case**: `usCaBorderLat(lng)` piecewise function models the actual border (49°N west, dips to 42.5°N at Great Lakes, back up to 45.5°N for Quebec/Maine)
- Fallback: multiple bbox matches → pick closest centroid (squared distance)

### `lib/countries.ts` — Country Info Registry
- 61 countries with name, ISO-2 code, hex color, flag emoji
- Covers all countries from: 2026 calendar, flight history, Google Maps timeline, visited countries list
- `getCountryInfo(code)` with fallback to generated entry for unknown codes
- Used throughout: calendar cells, year cards, transport bars, trackers

### `lib/timeline-parser.ts` — Google Maps Data Processor
- Exports: `processTimeline()`, `processReviews()`, `processPhotos()`, `extractHeatmapData()`
- Handles the phone export `semanticSegments` format (NOT older Takeout `timelineObjects`)
- 13 normalized activity types with `ACTIVITY_MAP`
- Distance calculation via Haversine formula
- Trip detection from `timelineMemory.trip` segments

---

## Environment Variables

```env
NOTION_API_KEY=           # Notion integration token
NOTION_PAGE_ID=           # Travel outline page ID
GROQ_API_KEY=             # Groq API key (free tier) — used by sync + CLI + insights API + chatbot
SYNC_INTERVAL_HOURS=6     # Cache TTL in hours
DATABASE_URL=             # PostgreSQL connection string (Railway private network)
```

---

## Deployment

1. Push to `github.com/Just-Say-Gio/where-is-gio`
2. Railway auto-deploys from `main` branch
3. After deploy: visit `/admin` -> click "Sync from Notion"
4. Custom domain: `whereisgio.com`

**Note:** Railway containers are ephemeral — `.cache/` is wiped on each deploy. Re-sync from `/admin` after every deployment. `hosting-overrides.json`, `data/maps-stats.json`, `data/maps-heatmap.json`, and `public/photos/heatmap/` are all committed to git and survive deploys. PostgreSQL analytics data persists across deploys (Railway managed database).

**Build script:** `npx prisma generate && next build` — Prisma client must be generated before Next.js build.

**To update Maps data:** Run the CLI script locally with the raw Takeout files, commit the output, and push.
