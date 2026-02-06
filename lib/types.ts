export interface TravelSegment {
  startDate: string; // "2026-01-01"
  endDate: string; // "2026-01-13"
  country: string; // "United States"
  countryCode: string; // "US"
  city?: string; // "Whitefish, Montana"
  notes?: string; // "Lodging + any local transport"
  status?: "confirmed" | "placeholder" | "option" | "transit";
}

export interface CalendarDay {
  date: string; // "2026-01-01"
  dayOfMonth: number;
  segment?: TravelSegment;
}

export interface YearSummary {
  personality: string;    // "The Timezone Juggler"
  summary: string;        // Witty 1-2 sentence year overview
  funFacts: string[];     // 3 quirky data-driven observations
  generatedAt: number;    // Unix timestamp ms
}

export interface CacheEntry {
  segments: TravelSegment[];
  lastFetched: number; // Unix timestamp ms
  contentHash: string;
  monthInsights?: string[]; // 12 AI-generated monthly taglines
  yearSummary?: YearSummary;
}

export interface HostingOverride {
  available: false;
  reason: string; // private — only visible in admin
}

export interface HostingData {
  overrides: Record<string, HostingOverride>; // key = "2026-02-15"
}

// Flight analytics types

export interface FlightRecord {
  date: string;            // "2024-05-07" (normalized from DD-MM-YYYY)
  year: number;
  startCity: string;
  destinationCity: string;
  airline: string;
  aircraft: string;
  reason: string;          // "Leisure" | "Business"
  seatClass: string;       // "Economy Class" | "Premium Economy" | "First Class"
  seatNumber: string;
  durationMinutes: number;
}

export interface VisitedRegion {
  visited: number;
  total: number;
  countries: { code: string; name: string; regions?: number }[];
}

export interface VisitedCountriesData {
  totalVisited: number;
  regions: Record<string, VisitedRegion>;
  allCodes: string[];               // flat list of all visited country codes
}

export interface FlightAnalytics {
  totalFlights: number;
  flights: FlightRecord[];
  totalCountries: number;
  countriesVisited: string[];       // country codes (from flights)
  totalCities: number;
  citiesVisited: string[];
  totalFlightHours: number;
  totalFlightMinutes: number;
  flightsByYear: Record<string, number>;
  flightsByAirline: Record<string, number>;
  flightsByAircraftFamily: Record<string, number>;
  flightsByReason: Record<string, number>;
  flightsByClass: Record<string, number>;
  cityCountryMap: Record<string, string>;
  // From visited-countries.json
  visitedCountries: VisitedCountriesData | null;
}

export interface FlightsCacheEntry {
  analytics: FlightAnalytics;
  lastParsed: number;
  csvHash: string;
  recordCount: number;
}
