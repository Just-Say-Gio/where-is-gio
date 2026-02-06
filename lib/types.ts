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

export interface CacheEntry {
  segments: TravelSegment[];
  lastFetched: number; // Unix timestamp ms
  contentHash: string;
}

export interface HostingOverride {
  available: false;
  reason: string; // private — only visible in admin
}

export interface HostingData {
  overrides: Record<string, HostingOverride>; // key = "2026-02-15"
}
