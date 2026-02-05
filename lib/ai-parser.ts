import Groq from "groq-sdk";
import { TravelSegment } from "./types";

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
