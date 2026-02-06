import Groq from "groq-sdk";
import { TravelSegment, YearSummary } from "./types";
import { TZ_OFFSETS } from "./timezone";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a travel data parser. Given raw travel notes/itinerary, extract a JSON object with a "segments" array.

Each segment must have:
- startDate: "YYYY-MM-DD" (ISO date)
- endDate: "YYYY-MM-DD" (ISO date, inclusive — the last day at that location)
- country: Full country name (e.g. "United States", "Thailand")
- countryCode: ISO 3166-1 alpha-2 code (e.g. "US", "TH")
- city: City or region name (optional but preferred)
- notes: Brief context (optional)
- status: "confirmed" | "placeholder" | "option" | "transit"

Rules:
- All dates are in 2026 unless otherwise specified
- endDate is inclusive (the last full day at that location)
- For transit entries spanning multiple days, use "transit" status and the destination country
- countryCode must be ISO 3166-1 alpha-2 (Singapore = "SG", Hong Kong = "HK", Czech Republic = "CZ", United Kingdom = "GB")
- Do NOT create overlapping date ranges. If the source has overlaps, pick the primary confirmed location
- For "option" entries that overlap with other plans, include them ONLY if they don't overlap with confirmed/placeholder entries
- Sort segments chronologically by startDate
- If a segment says "Hua Hin base" or similar, the country is Thailand (TH)
- Scotland is part of United Kingdom (GB)
- Handle informal date references ("end of month", "a few weeks") by inferring reasonable dates

Return ONLY a valid JSON object: { "segments": [...] }`;

export async function parseTravelData(
  rawText: string
): Promise<TravelSegment[]> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Parse this travel itinerary into structured segments:\n\n${rawText}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI parser");
  }

  const parsed = JSON.parse(content);
  const segments: TravelSegment[] = parsed.segments;

  // Validate and sort
  const validated = segments
    .filter(
      (s) =>
        s.startDate &&
        s.endDate &&
        s.country &&
        s.countryCode &&
        !isNaN(Date.parse(s.startDate)) &&
        !isNaN(Date.parse(s.endDate))
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  return validated;
}

const INSIGHTS_PROMPT = `You write tiny, clever taglines for a travel calendar. You'll get a month-by-month breakdown of someone's year. For each month, write ONE punchy tagline (2-5 words).

Your taglines should be:
- SPECIFIC to the actual places and context (reference real city names, countries, vibes)
- Witty, like a friend ribbing you about your travel ("not again, Prague" or "Hua Hin hibernation")
- Self-aware about patterns (if someone keeps going back to the same place, joke about it)
- Data-aware (if a month has 6 countries, acknowledge the chaos)
- Varied — never repeat a pattern or structure across months
- Lowercase, no punctuation

Good examples: "hua hin on repeat", "6 flags no theme park", "peru finally", "the czech chapter", "ski bum era", "monsoon who cares", "amsterdam detour", "back to base"
Bad examples: "travel time", "adventure awaits", "new horizons", "exploring the world" (too generic)

Return ONLY valid JSON: { "insights": ["jan tagline", "feb tagline", ..., "dec tagline"] }`;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function buildMonthContext(segments: TravelSegment[]): string {
  const lines: string[] = [];

  for (let m = 0; m < 12; m++) {
    const monthStart = `2026-${String(m + 1).padStart(2, "0")}-01`;
    const nextMonth = m < 11
      ? `2026-${String(m + 2).padStart(2, "0")}-01`
      : "2027-01-01";

    // Find segments overlapping this month
    const monthSegs = segments.filter((s) => s.startDate < nextMonth && s.endDate >= monthStart);

    const countries = new Map<string, string[]>();
    let travelDays = 0;
    const daysInMonth = new Date(2026, m + 1, 0).getDate();

    for (const s of monthSegs) {
      const start = new Date(Math.max(new Date(s.startDate).getTime(), new Date(monthStart).getTime()));
      const end = new Date(Math.min(new Date(s.endDate).getTime(), new Date(nextMonth).getTime() - 86400000));
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      if (days > 0) {
        travelDays += days;
        if (!countries.has(s.country)) countries.set(s.country, []);
        if (s.city && !countries.get(s.country)!.includes(s.city)) {
          countries.get(s.country)!.push(s.city);
        }
      }
    }

    const homeDays = daysInMonth - travelDays;
    const countryList = [...countries.entries()]
      .map(([country, cities]) => cities.length > 0 ? `${country} (${cities.join(", ")})` : country)
      .join(", ");

    const statusMix = monthSegs.filter((s) => s.status && s.status !== "confirmed").map((s) => s.status);
    const hasTentative = statusMix.includes("placeholder");

    let summary = `${MONTH_NAMES[m]}: `;
    if (countries.size === 0) {
      summary += "No travel data";
    } else if (countries.size === 1 && homeDays <= 2) {
      summary += `All month in ${countryList}`;
    } else {
      summary += `${countries.size} countries (${countryList}), ${travelDays}d traveling, ${homeDays}d home`;
    }
    if (hasTentative) summary += " [some tentative]";

    lines.push(summary);
  }

  return lines.join("\n");
}

export async function generateMonthlyInsights(
  segments: TravelSegment[]
): Promise<string[]> {
  const context = buildMonthContext(segments);

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: INSIGHTS_PROMPT },
      {
        role: "user",
        content: `This person lives in Hua Hin, Thailand as their home base. They're a digital nomad who travels frequently. Generate a tagline for each month:\n\n${context}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 512,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI insights");

  const parsed = JSON.parse(content);
  const insights: string[] = parsed.insights;

  if (!Array.isArray(insights) || insights.length !== 12) {
    throw new Error(`Expected 12 insights, got ${insights?.length}`);
  }

  return insights.map((s) => String(s).slice(0, 40)); // safety cap
}

// --- Year Summary AI ---

const YEAR_SUMMARY_PROMPT = `You write personality-driven travel summaries. Given someone's year of travel statistics, generate three things:

1. "personality" — A 2-4 word travel personality label. Creative and specific to their pattern. Examples: "The Timezone Juggler", "Bangkok's Boomerang", "Serial Border Hopper". Funny but accurate.

2. "summary" — A witty 1-2 sentence summary incorporating real numbers from the stats. Reference actual countries/cities. Be cheeky, like a friend teasing them. No generic motivational fluff.

3. "funFacts" — Exactly 3 short, quirky, data-driven observations. Each should be:
   - Specific to the actual data (reference real numbers, countries, cities)
   - Framed as a surprising comparison or amusing observation
   - 1 sentence each, max 120 characters
   - Examples of good style: "Your timezone shifts add up to more jet lag than a long-haul pilot", "Thailand to Czech Republic is a 12-hour time shift — you do that twice"

Return ONLY valid JSON: { "personality": "...", "summary": "...", "funFacts": ["...", "...", "..."] }`;

function segPriority(s: TravelSegment): number {
  switch (s.status) {
    case "confirmed": return 3;
    case "placeholder": return 2;
    case "transit": return 1;
    case "option": return 0;
    default: return 2;
  }
}

function buildYearContext(segments: TravelSegment[]): string {
  // Generate all 365 days and resolve segments
  const allDays: { date: string; code: string | null; city: string | null }[] = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(2026, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `2026-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTime = new Date(dateStr + "T00:00:00").getTime();

      let bestSeg: TravelSegment | null = null;
      for (const s of segments) {
        const start = new Date(s.startDate + "T00:00:00").getTime();
        const end = new Date(s.endDate + "T00:00:00").getTime();
        if (dayTime >= start && dayTime <= end) {
          if (!bestSeg || segPriority(s) > segPriority(bestSeg)) bestSeg = s;
        }
      }
      allDays.push({ date: dateStr, code: bestSeg?.countryCode ?? null, city: bestSeg?.city ?? null });
    }
  }

  // Home base = most segment days
  const countryDays = new Map<string, number>();
  let uncovered = 0;
  for (const d of allDays) {
    if (!d.code) { uncovered++; continue; }
    countryDays.set(d.code, (countryDays.get(d.code) || 0) + 1);
  }
  const sorted = [...countryDays.entries()].sort((a, b) => b[1] - a[1]);
  const homeCode = sorted[0]?.[0] ?? "TH";
  if (uncovered > 0) countryDays.set(homeCode, (countryDays.get(homeCode) || 0) + uncovered);

  const homeDays = countryDays.get(homeCode) || 0;
  const daysAbroad = 365 - homeDays;

  // Count trips
  let trips = 0;
  let wasAbroad = false;
  for (const d of allDays) {
    const abroad = d.code !== null && d.code !== homeCode;
    if (abroad && !wasAbroad) trips++;
    wasAbroad = abroad;
  }

  // Unique cities
  const cities = new Set(allDays.filter(d => d.city).map(d => d.city!));

  // Timezone shifts
  let tzShifts = 0;
  let lastOffset: number | null = null;
  for (const d of allDays) {
    const code = d.code ?? homeCode;
    const offset = TZ_OFFSETS[code] ?? 7;
    if (lastOffset !== null && offset !== lastOffset) {
      tzShifts += Math.abs(offset - lastOffset);
    }
    lastOffset = offset;
  }

  // Country list with days
  const countryList = [...countryDays.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, days]) => `${code}: ${days}d`)
    .join(", ");

  // Confirmed ratio
  const confirmed = segments.filter(s => s.status === "confirmed").length;

  return [
    `Home base: ${homeCode} (Thailand)`,
    `Unique countries: ${countryDays.size}`,
    `Days abroad: ${daysAbroad}/365 (${Math.round((daysAbroad / 365) * 100)}%)`,
    `Trips: ${trips}`,
    `Unique cities: ${cities.size} (${[...cities].join(", ")})`,
    `Cumulative timezone shift: ${Math.round(tzShifts)}h`,
    `Countries by days: ${countryList}`,
    `Confirmed segments: ${confirmed}/${segments.length}`,
  ].join("\n");
}

export async function generateYearSummary(
  segments: TravelSegment[]
): Promise<YearSummary> {
  const context = buildYearContext(segments);

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: YEAR_SUMMARY_PROMPT },
      {
        role: "user",
        content: `This person is a digital nomad based in Hua Hin, Thailand. Generate a travel personality profile from their 2026 data:\n\n${context}`,
      },
    ],
    temperature: 0.9,
    max_tokens: 512,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI year summary");

  const parsed = JSON.parse(content);

  if (!parsed.personality || !parsed.summary || !Array.isArray(parsed.funFacts)) {
    throw new Error("Invalid year summary format");
  }

  return {
    personality: String(parsed.personality).slice(0, 50),
    summary: String(parsed.summary).slice(0, 200),
    funFacts: parsed.funFacts.slice(0, 3).map((f: unknown) => String(f).slice(0, 150)),
    generatedAt: Date.now(),
  };
}
