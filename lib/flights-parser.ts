import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { FlightRecord, FlightAnalytics, VisitedCountriesData } from "./types";
import { getCountryFromCity, getAllCountriesFromFlights } from "./city-country-map";

const CSV_PATH = join(process.cwd(), "flights_export.csv");
const VISITED_PATH = join(process.cwd(), "visited-countries.json");

// Minimal RFC 4180 CSV row parser (handles quoted fields with commas)
function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseDate(ddmmyyyy: string): { iso: string; year: number } {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return { iso: `${yyyy}-${mm}-${dd}`, year: parseInt(yyyy, 10) };
}

function parseDuration(duration: string): number {
  if (!duration || duration === "00:00") return 0;
  const [hh, mm] = duration.split(":").map(Number);
  return hh * 60 + (mm || 0);
}

function normalizeAircraftFamily(aircraft: string): string {
  if (/Airbus A32[01]/i.test(aircraft)) return "Airbus A320 family";
  if (/Airbus A321/i.test(aircraft)) return "Airbus A321";
  if (/Airbus A330/i.test(aircraft)) return "Airbus A330";
  if (/Airbus A350/i.test(aircraft)) return "Airbus A350";
  if (/Airbus A380/i.test(aircraft)) return "Airbus A380";
  if (/Airbus A220/i.test(aircraft)) return "Airbus A220";
  if (/Boeing 737/i.test(aircraft)) return "Boeing 737 family";
  if (/Boeing 777/i.test(aircraft)) return "Boeing 777";
  if (/Boeing 787/i.test(aircraft)) return "Boeing 787";
  if (/Embraer/i.test(aircraft)) return "Embraer regional";
  return aircraft;
}

export function parseFlightsCSV(): { analytics: FlightAnalytics; csvHash: string } {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const csvHash = createHash("md5").update(raw).digest("hex");

  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const flights: FlightRecord[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVRow(lines[i]);
    if (fields.length < 9) continue;

    const { iso, year } = parseDate(fields[0]);
    flights.push({
      date: iso,
      year,
      startCity: fields[1],
      destinationCity: fields[2],
      airline: fields[3],
      aircraft: fields[4],
      reason: fields[5],
      seatClass: fields[6],
      seatNumber: fields[7],
      durationMinutes: parseDuration(fields[8]),
    });
  }

  const countryCodes = getAllCountriesFromFlights(flights);

  const allCities = new Set<string>();
  const cityCountryMap: Record<string, string> = {};
  for (const f of flights) {
    allCities.add(f.startCity);
    allCities.add(f.destinationCity);
    cityCountryMap[f.startCity] = getCountryFromCity(f.startCity);
    cityCountryMap[f.destinationCity] = getCountryFromCity(f.destinationCity);
  }

  const totalMinutes = flights.reduce((sum, f) => sum + f.durationMinutes, 0);

  const flightsByYear: Record<string, number> = {};
  const flightsByAirline: Record<string, number> = {};
  const flightsByAircraftFamily: Record<string, number> = {};
  const flightsByReason: Record<string, number> = {};
  const flightsByClass: Record<string, number> = {};

  for (const f of flights) {
    const yr = String(f.year);
    flightsByYear[yr] = (flightsByYear[yr] || 0) + 1;
    flightsByAirline[f.airline] = (flightsByAirline[f.airline] || 0) + 1;
    const family = normalizeAircraftFamily(f.aircraft);
    flightsByAircraftFamily[family] = (flightsByAircraftFamily[family] || 0) + 1;
    flightsByReason[f.reason] = (flightsByReason[f.reason] || 0) + 1;
    flightsByClass[f.seatClass] = (flightsByClass[f.seatClass] || 0) + 1;
  }

  // Load visited countries from JSON
  const visitedCountries = loadVisitedCountries();

  const analytics: FlightAnalytics = {
    totalFlights: flights.length,
    flights,
    totalCountries: countryCodes.length,
    countriesVisited: countryCodes,
    totalCities: allCities.size,
    citiesVisited: [...allCities].sort(),
    totalFlightHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalFlightMinutes: totalMinutes,
    flightsByYear,
    flightsByAirline,
    flightsByAircraftFamily,
    flightsByReason,
    flightsByClass,
    cityCountryMap,
    visitedCountries,
  };

  return { analytics, csvHash };
}

function loadVisitedCountries(): VisitedCountriesData | null {
  try {
    if (!existsSync(VISITED_PATH)) return null;
    const raw = readFileSync(VISITED_PATH, "utf-8");
    const data = JSON.parse(raw);

    // Flatten all country codes from all regions
    const allCodes: string[] = [];
    for (const region of Object.values(data.regions) as { countries: { code: string }[] }[]) {
      for (const c of region.countries) {
        allCodes.push(c.code);
      }
    }

    return {
      totalVisited: data.totalVisited ?? allCodes.length,
      regions: data.regions,
      allCodes: allCodes.sort(),
    };
  } catch {
    return null;
  }
}
