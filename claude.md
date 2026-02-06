# CLAUDE.md - Where Is Gio

## Project Overview

**Where Is Gio** is a travel calendar website that shows where Gio is (or will be) throughout 2026. It syncs with a Notion travel outline, uses AI to parse unstructured notes into structured data, and displays a color-coded year calendar with flags, tooltips, and travel stats.

**Live at:** `whereisgio.com`
**Repo:** `github.com/Just-Say-Gio/where-is-gio`

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework (App Router, ISR) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | Latest | UI components (tooltip, badge, card, popover) |
| Notion API | @notionhq/client 5.x | Data source — fetches travel schedule blocks |
| Groq SDK | 0.37.x | AI parsing (llama-3.3-70b-versatile, JSON mode) |
| Railway | — | Hosting (Nixpacks, Node 20+) |

---

## Architecture

```
Notion Travel Page
        |
        v
  /admin → "Sync from Notion" button
        |
        v
  Notion API (paginated block fetch)
        |
        v
  Groq AI (llama-3.3-70b-versatile, temp 0.1, JSON mode)
        |
        v
  File cache (.cache/segments.json)
        |
        v
  Server component reads cache → renders calendar
```

**Key design decision:** The main page never calls Groq directly. Data is only fetched via the `/admin` page manually. This prevents 429 rate limit errors from crashing the site.

---

## Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Dynamic (SSR) | Main year calendar with country colors, flags, tooltips |
| `/when-can-I-stay` | Dynamic (SSR) | Public page showing when Gio is in Thailand and available to host |
| `/admin` | Static | Sync button, cache status, sync logs with step timing |
| `/admin/hosting` | Static | Interactive calendar to mark Thailand dates as unavailable |
| `/api/sync` | API | Triggers Notion fetch + Groq parse, returns step-by-step results |
| `/api/sync/status` | API | Returns current cache status (last synced, segment count) |
| `/api/segments` | API | Returns cached travel segments as JSON |
| `/api/hosting` | API | GET/POST/DELETE for hosting availability overrides |

---

## File Structure

```
where-is-gio/
├── claude.md
├── .env.local                    # API keys (gitignored)
├── .node-version                 # Node 20 for Railway/Nixpacks
├── railway.json                  # Build/start config
├── carlogo.json                  # Car brand logo URLs for auth gate
│
├── app/
│   ├── layout.tsx                # Root layout, Geist font, dark mode script
│   ├── page.tsx                  # Main calendar (reads cache only, force-dynamic)
│   ├── globals.css               # Tailwind v4 + shadcn vars + custom animations
│   ├── admin/
│   │   ├── page.tsx              # Sync dashboard with logs
│   │   └── hosting/page.tsx      # Interactive hosting override manager
│   ├── when-can-I-stay/page.tsx  # Public hosting availability calendar
│   └── api/
│       ├── sync/route.ts         # Notion + Groq sync with step timing
│       ├── sync/status/route.ts  # Cache status endpoint
│       ├── segments/route.ts     # Cached segments JSON endpoint
│       └── hosting/route.ts      # Hosting overrides CRUD
│
├── components/
│   ├── ui/                       # shadcn: tooltip, badge, card, popover
│   ├── auth-gate.tsx             # 3-step friends-only quiz gate
│   ├── calendar-wrapper.tsx      # Client boundary (highlight, today state)
│   ├── header.tsx                # Current location + next trip countdown
│   ├── year-calendar.tsx         # Responsive 4x3 / 3x4 / 2x6 grid
│   ├── month-grid.tsx            # Month with day headers + week numbers
│   ├── day-cell.tsx              # Colored cell with flag, tooltip, hover
│   ├── legend.tsx                # Country badges, click to highlight
│   ├── country-stats.tsx         # Travel stats bar chart
│   ├── theme-toggle.tsx          # Dark mode toggle
│   └── when-calendar.tsx         # Hosting availability calendar component
│
├── lib/
│   ├── types.ts                  # TravelSegment, CalendarDay, CacheEntry, HostingOverride
│   ├── notion.ts                 # Recursive block fetch with pagination
│   ├── ai-parser.ts              # Groq prompt + JSON parsing + validation
│   ├── cache.ts                  # File-based cache (.cache/segments.json)
│   ├── hosting.ts                # Hosting overrides (.cache/hosting-overrides.json)
│   ├── countries.ts              # Country → color/flag/lightColor mapping
│   ├── calendar-utils.ts         # Date generation, segment assignment, week numbers
│   └── utils.ts                  # shadcn cn() helper
│
└── .cache/                       # Gitignored runtime cache
    ├── segments.json             # Travel data (from Notion + Groq)
    └── hosting-overrides.json    # Manual hosting unavailability marks
```

---

## Key Features

- **Year-at-a-glance calendar** with country-colored cells and flag emojis
- **Monday-start weeks** with day-of-week headers (M T W T F S S) and ISO week numbers
- **Tooltips** on hover with date, country, city, and notes
- **Interactive legend** — click a country to highlight/dim its days
- **Travel stats** — days per country bar chart, top-level metrics
- **Current location** with pulsing indicator + next trip countdown
- **Dark mode** with localStorage persistence and flash prevention
- **Friends-only auth gate** — 3-step quiz: car logos (Skoda) → F1 drivers (Verstappen with Super Max celebration) → country to delete (all options are France)
- **Hosting availability** (`/when-can-I-stay`) — shows Thailand dates, admin can mark dates unavailable with private reasons
- **Admin dashboard** (`/admin`) — manual Notion sync with detailed logs, step timing, cache status
- **File-based caching** — persists across workers/processes, separate files for travel data vs hosting overrides

---

## Auth Gate Flow

1. **Car logos** — 10 brands with imgix logos, answer: Skoda
2. **F1 drivers** — 10 drivers with racing numbers, answer: Max Verstappen → orange celebration with lions/trophies
3. **Countries** — all 6 options are "France" with French flag (the joke: nobody likes France) → "You, I like you." → flag rain → cookie set for 1 year

---

## Caching Strategy

Two separate files in `.cache/`:

| File | Contents | Updated by | Survives |
|------|----------|-----------|----------|
| `segments.json` | Travel segments from Notion + Groq | `/admin` sync button | Cache reloads |
| `hosting-overrides.json` | Manual hosting unavailability | `/admin/hosting` UI | Everything (independent) |

The main page only reads from cache — never triggers API calls. After each Railway deploy, visit `/admin` to re-sync.

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
3. After deploy: visit `/admin` → click "Sync from Notion"
4. Custom domain: `whereisgio.com`

**Note:** Railway containers are ephemeral — `.cache/` is wiped on each deploy. Re-sync from `/admin` after every deployment.

---

## Country Colors

Maximally distinct hues spread across the color wheel:

| Code | Country | Color | Hex |
|------|---------|-------|-----|
| US | United States | Blue | #3B82F6 |
| TH | Thailand | Orange | #F97316 |
| SG | Singapore | Violet | #8B5CF6 |
| IN | India | Emerald | #10B981 |
| GB | United Kingdom | Red | #EF4444 |
| CZ | Czech Republic | Cyan | #06B6D4 |
| NL | Netherlands | Lime | #84CC16 |
| PE | Peru | Pink | #EC4899 |
| IT | Italy | Yellow | #FBBF24 |
| BR | Brazil | Teal | #14B8A6 |
| MX | Mexico | Indigo | #6366F1 |
| DE | Germany | Fuchsia | #D946EF |
| HK | Hong Kong | Rose | #F43F5E |
