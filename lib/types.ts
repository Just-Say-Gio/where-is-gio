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

export interface RiceRunEntry {
  note?: string;
}

export interface RiceRunData {
  riceRuns: Record<string, RiceRunEntry>; // key = "2026-02-07"
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

// Google Maps aggregated stats (from data/maps-stats.json)

export interface MapsStatsData {
  processedAt: string;
  dataRange: { start: string; end: string };
  distance: {
    totalKm: number;
    flying: number;
    driving: number;
    train: number;
    motorcycling: number;
    ferry: number;
    walking: number;
    cycling: number;
    bus: number;
    subway: number;
    running: number;
    tram: number;
    skiing: number;
    other: number;
  };
  counts: {
    totalVisits: number;
    uniquePlaces: number;
    totalActivities: number;
    totalTrips: number;
    totalDaysTracked: number;
    totalSegments: number;
  };
  yearlyStats: {
    year: number;
    visits: number;
    activities: number;
    totalKm: number;
    distanceByMode: Record<string, number>;
    uniquePlaces: number;
    daysTracked: number;
    trips: number;
    timezones: number;
    topMode: string;
    kmPerDay: number;
    countries: string[];
  }[];
  monthlyStats: {
    month: string;
    visits: number;
    activities: number;
    totalKm: number;
  }[];
  activityDistribution: Record<string, number>;
  records: {
    farthestTrip: { distanceKm: number; startDate: string; endDate: string } | null;
    busiestYear: { year: number; visits: number; distanceKm: number } | null;
    mostActiveDay: { date: string; activities: number } | null;
    longestFlight: { distanceKm: number; date: string } | null;
  };
  reviews: {
    total: number;
    countries: number;
    avgRating: number;
    byCountry: Record<string, number>;
    byYear: Record<string, number>;
    ratingDistribution: Record<string, number>;
  } | null;
  photos: {
    total: number;
    geotagged: number;
    dateRange: { start: string; end: string } | null;
    byYear: Record<string, number>;
  } | null;
  insights: string[] | null;
}

// Photo heatmap types (from data/maps-heatmap.json)

export interface HeatCell {
  lat: number;
  lng: number;
  weight: number;
}

export interface TopPhoto {
  lat: number;
  lng: number;
  imageViews: number;
  title: string;
  description: string;
  date: string;
  imagePath: string;
}

export interface ReviewPoint {
  lat: number;
  lng: number;
  name: string;
  rating: number;
  date: string;
  countryCode: string;
  text: string;
}

export interface HeatmapData {
  processedAt: string;
  heatPoints: HeatCell[];
  topPhotos: TopPhoto[];
  reviews: ReviewPoint[];
  stats: {
    totalVisits: number;
    heatCells: number;
    totalPhotos: number;
    totalPhotoViews: number;
    topViewCount: number;
    totalReviews: number;
  };
}
