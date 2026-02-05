# CLAUDE.md - Where Is Gio

## Project Overview

**Where Is Gio** is a fun, minimal travel calendar website that shows where Gio is (or will be) throughout the year. It syncs with a Notion travel outline and displays a color-coded year calendar — one glance shows the whole year's travel plans.

**Live at:** `whereisgio.com`

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14+ | React framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| Notion API | Data source (travel schedule) |
| Groq API (free) | AI interpretation of travel data |
| PostgreSQL (Railway) | Optional caching layer |
| Railway | Hosting |

---

## How It Works

```
Notion Travel Outline
        ↓
   Sync (every X hours via cron or on-demand)
        ↓
   AI interprets unstructured travel notes → structured data
        ↓
   Store in DB (or in-memory cache)
        ↓
   Display as color-coded year calendar
```

---

## Data Flow

### 1. Notion Source
- Source page ID: `2e0f6dd5ddfb80108e99e2896d7c5d7d`
- Contains travel plans with dates and locations
- May be unstructured/informal text — AI parses it

### 2. AI Interpretation
Use Groq (free tier) to parse Notion content into structured travel data:
```typescript
interface TravelSegment {
  startDate: string;      // ISO date
  endDate: string;        // ISO date
  country: string;        // "Netherlands", "Thailand", etc.
  countryCode: string;    // "NL", "TH", etc.
  city?: string;          // Optional city
  notes?: string;         // Optional context
}
```

### 3. Calendar Display
- Full year view (Jan–Dec)
- Each day is a small colored cell
- Color-coded by country
- Hover/tap shows details
- Legend showing country → color mapping

---

## Project Structure

```
where-is-gio/
├── CLAUDE.md
├── .env.local              # API keys (gitignored)
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # Main calendar page
│   ├── api/
│   │   ├── sync/route.ts   # Notion sync endpoint
│   │   └── calendar/route.ts
│   └── globals.css
├── components/
│   ├── ui/                 # shadcn components
│   ├── year-calendar.tsx   # Main calendar grid
│   ├── day-cell.tsx
│   ├── legend.tsx
│   └── header.tsx
├── lib/
│   ├── notion.ts           # Notion API client
│   ├── ai-parser.ts        # Groq AI interpretation
│   ├── countries.ts        # Country → color mapping
│   └── utils.ts
└── prisma/                 # Optional DB
    └── schema.prisma
```

---

## Color Scheme

Each country gets a distinct, fun color:
```typescript
const COUNTRY_COLORS = {
  'NL': '#FF6B35',  // Netherlands - Orange
  'TH': '#4ECDC4',  // Thailand - Teal
  'DE': '#FFE66D',  // Germany - Yellow
  'US': '#95E1D3',  // USA - Mint
  'IN': '#F38181',  // India - Coral
  'GB': '#AA96DA',  // UK - Purple
  'HK': '#FF8C94',  // Hong Kong - Pink
  // ... generate more as needed
};
```

---

## Environment Variables

```env
# Notion
NOTION_API_KEY=
NOTION_PAGE_ID=2e0f6dd5ddfb80108e99e2896d7c5d7d

# AI (Groq - free tier)
GROQ_API_KEY=

# Optional: Railway PostgreSQL
DATABASE_URL=

# Sync
SYNC_INTERVAL_HOURS=6
```

---

## Features

- **Year-at-a-glance**: See entire year in one compact view
- **Color-coded countries**: Each country a different vibrant color
- **Current location**: Header shows "Currently in: 🇹🇭 Thailand"
- **Hover details**: Date range, city, notes
- **Country legend**: Click to highlight all days in that country
- **Mobile-friendly**: Compact grid works on phones
- **Auto-sync**: Refreshes from Notion periodically
- **AI-powered**: Parses informal travel notes into structured data

---

## Do's and Don'ts

### DO
- Keep it simple — one page, one purpose
- Make it fun — bright colors, flag emojis, playful tone
- Mobile-first — must fit on phone screens
- Cache data — don't hit Notion every request

### DON'T
- Overcomplicate — no auth, no accounts
- Over-design — clean beats clever
- Expose keys — all API calls server-side

---

## Deployment

1. Push to GitHub
2. Connect to Railway
3. Add env vars
4. Add custom domain: `whereisgio.com`