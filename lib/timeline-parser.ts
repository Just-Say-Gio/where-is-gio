/**
 * Google Maps Timeline data parser.
 * Processes the phone-exported `semanticSegments` format (NOT older Takeout `timelineObjects`).
 * All GPS coordinates and placeIds are used only during aggregation and never stored.
 */

import { coordToCountry } from "./country-bbox";

// ── Activity type normalization ──

const ACTIVITY_MAP: Record<string, string> = {
  IN_PASSENGER_VEHICLE: "driving",
  MOTORCYCLING: "motorcycling",
  WALKING: "walking",
  ON_FOOT: "walking",
  RUNNING: "running",
  CYCLING: "cycling",
  ON_BICYCLE: "cycling",
  IN_TRAIN: "train",
  IN_BUS: "bus",
  IN_SUBWAY: "subway",
  IN_TRAM: "tram",
  FLYING: "flying",
  IN_FERRY: "ferry",
  SKIING: "skiing",
};

export type TransportMode =
  | "driving"
  | "motorcycling"
  | "walking"
  | "running"
  | "cycling"
  | "train"
  | "bus"
  | "subway"
  | "tram"
  | "flying"
  | "ferry"
  | "skiing"
  | "other";

const ALL_MODES: TransportMode[] = [
  "flying",
  "driving",
  "train",
  "motorcycling",
  "ferry",
  "walking",
  "cycling",
  "bus",
  "subway",
  "running",
  "tram",
  "skiing",
  "other",
];

function normalizeActivity(raw: string): TransportMode {
  return (ACTIVITY_MAP[raw] as TransportMode) ?? "other";
}

// ── Segment types from phone export ──

interface RawVisit {
  hierarchyLevel?: number;
  probability?: number;
  topCandidate?: {
    placeId?: string;
    semanticType?: string;
    probability?: number;
    placeLocation?: { latLng?: string };
  };
}

interface RawActivity {
  start?: { latLng?: string };
  end?: { latLng?: string };
  distanceMeters?: number;
  topCandidate?: { type?: string; probability?: number };
  routeSegment?: unknown;
}

interface RawTimelineMemory {
  trip?: {
    distanceFromOriginKms?: number;
    destinations?: { identifier?: { placeId?: string } }[];
  };
}

interface RawSegment {
  startTime?: string;
  endTime?: string;
  startTimeTimezoneUtcOffsetMinutes?: number;
  endTimeTimezoneUtcOffsetMinutes?: number;
  visit?: RawVisit;
  activity?: RawActivity;
  timelinePath?: { point?: string; time?: string }[];
  timelineMemory?: RawTimelineMemory;
}

// ── Output types ──

export interface DistanceByMode {
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
}

export interface YearlyStat {
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
  countries: string[];       // ISO-2 country codes visited that year (from coordinate lookup)
}

export interface MonthlyStat {
  month: string; // "2024-05"
  visits: number;
  activities: number;
  totalKm: number;
}

export interface RecordStats {
  farthestTrip: { distanceKm: number; startDate: string; endDate: string } | null;
  busiestYear: { year: number; visits: number; distanceKm: number } | null;
  mostActiveDay: { date: string; activities: number } | null;
  longestFlight: { distanceKm: number; date: string } | null;
}

export interface ReviewStats {
  total: number;
  countries: number;
  avgRating: number;
  byCountry: Record<string, number>;
  byYear: Record<string, number>;
  ratingDistribution: Record<string, number>;
}

export interface PhotoStats {
  total: number;
  geotagged: number;
  dateRange: { start: string; end: string } | null;
  byYear: Record<string, number>;
}

export interface MapsStatsOutput {
  processedAt: string;
  dataRange: { start: string; end: string };
  distance: DistanceByMode;
  counts: {
    totalVisits: number;
    uniquePlaces: number;
    totalActivities: number;
    totalTrips: number;
    totalDaysTracked: number;
    totalSegments: number;
  };
  yearlyStats: YearlyStat[];
  monthlyStats: MonthlyStat[];
  activityDistribution: Record<string, number>;
  records: RecordStats;
  reviews: ReviewStats | null;
  photos: PhotoStats | null;
  insights: string[] | null;
}

// ── Coordinate parsing ──

export function parseLatLng(latLngStr: string | undefined): [number, number] | null {
  if (!latLngStr) return null;
  // Format: "52.4892162°, 5.5023953°"
  const match = latLngStr.match(/^([-\d.]+)°,\s*([-\d.]+)°$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  return isNaN(lat) || isNaN(lng) ? null : [lat, lng];
}

// ── Parsing helpers ──

function extractDate(isoStr: string | undefined): string | null {
  if (!isoStr) return null;
  // ISO 8601: "2024-05-07T14:39:24.000+07:00"
  const m = isoStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function extractYearMonth(isoStr: string | undefined): string | null {
  if (!isoStr) return null;
  const m = isoStr.match(/^(\d{4}-\d{2})/);
  return m ? m[1] : null;
}

function extractYear(isoStr: string | undefined): number | null {
  if (!isoStr) return null;
  const m = isoStr.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

// ── Main processing ──

export function processTimeline(segments: RawSegment[]): Omit<MapsStatsOutput, "reviews" | "photos" | "insights"> {
  const distanceByMode: Record<TransportMode, number> = {} as Record<TransportMode, number>;
  for (const m of ALL_MODES) distanceByMode[m] = 0;

  let totalVisits = 0;
  let totalActivities = 0;
  let totalTrips = 0;
  const uniquePlaces = new Set<string>();
  const daysTracked = new Set<string>();
  const dayActivityCounts = new Map<string, number>();

  // Per-year
  const yearVisits = new Map<number, number>();
  const yearActivities = new Map<number, number>();
  const yearKm = new Map<number, number>();
  const yearModeKm = new Map<number, Record<string, number>>();
  const yearUniquePlaces = new Map<number, Set<string>>();
  const yearDaysTracked = new Map<number, Set<string>>();
  const yearTrips = new Map<number, number>();
  const yearTimezones = new Map<number, Set<number>>();
  const yearCountries = new Map<number, Set<string>>();

  // Per-month
  const monthVisits = new Map<string, number>();
  const monthActivities = new Map<string, number>();
  const monthKm = new Map<string, number>();

  // Records
  let longestFlightKm = 0;
  let longestFlightDate = "";
  let farthestTripKm = 0;
  let farthestTripStart = "";
  let farthestTripEnd = "";

  let minDate = "9999-12-31";
  let maxDate = "0000-01-01";

  for (const seg of segments) {
    const date = extractDate(seg.startTime);
    const ym = extractYearMonth(seg.startTime);
    const year = extractYear(seg.startTime);

    if (date) {
      daysTracked.add(date);
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
      if (year) {
        if (!yearDaysTracked.has(year)) yearDaysTracked.set(year, new Set());
        yearDaysTracked.get(year)!.add(date);
      }
    }
    const endDate = extractDate(seg.endTime);
    if (endDate && endDate > maxDate) maxDate = endDate;

    // Track timezone offsets per year
    if (year && seg.startTimeTimezoneUtcOffsetMinutes != null) {
      if (!yearTimezones.has(year)) yearTimezones.set(year, new Set());
      yearTimezones.get(year)!.add(seg.startTimeTimezoneUtcOffsetMinutes);
    }

    // ── Visit ──
    if (seg.visit) {
      totalVisits++;
      const placeId = seg.visit.topCandidate?.placeId;
      if (placeId) {
        uniquePlaces.add(placeId);
        if (year) {
          if (!yearUniquePlaces.has(year)) yearUniquePlaces.set(year, new Set());
          yearUniquePlaces.get(year)!.add(placeId);
        }
      }

      // Country lookup from coordinates
      if (year) {
        const visitCoords = parseLatLng(seg.visit.topCandidate?.placeLocation?.latLng);
        if (visitCoords) {
          const cc = coordToCountry(visitCoords[0], visitCoords[1]);
          if (cc) {
            if (!yearCountries.has(year)) yearCountries.set(year, new Set());
            yearCountries.get(year)!.add(cc);
          }
        }
      }

      if (year) yearVisits.set(year, (yearVisits.get(year) ?? 0) + 1);
      if (ym) monthVisits.set(ym, (monthVisits.get(ym) ?? 0) + 1);
    }

    // ── Activity ──
    if (seg.activity) {
      totalActivities++;
      const rawType = seg.activity.topCandidate?.type ?? "UNKNOWN_ACTIVITY_TYPE";
      const mode = normalizeActivity(rawType);
      const km = (seg.activity.distanceMeters ?? 0) / 1000;

      distanceByMode[mode] += km;

      if (year) {
        yearActivities.set(year, (yearActivities.get(year) ?? 0) + 1);
        yearKm.set(year, (yearKm.get(year) ?? 0) + km);
        if (!yearModeKm.has(year)) yearModeKm.set(year, {});
        const ym_km = yearModeKm.get(year)!;
        ym_km[mode] = (ym_km[mode] ?? 0) + km;
      }
      if (ym) {
        monthActivities.set(ym, (monthActivities.get(ym) ?? 0) + 1);
        monthKm.set(ym, (monthKm.get(ym) ?? 0) + km);
      }

      if (date) {
        dayActivityCounts.set(date, (dayActivityCounts.get(date) ?? 0) + 1);
      }

      // Track longest flight
      if (mode === "flying" && km > longestFlightKm && date) {
        longestFlightKm = km;
        longestFlightDate = date;
      }
    }

    // ── Trip memory ──
    if (seg.timelineMemory?.trip) {
      totalTrips++;
      if (year) yearTrips.set(year, (yearTrips.get(year) ?? 0) + 1);
      const tripKm = seg.timelineMemory.trip.distanceFromOriginKms ?? 0;
      if (tripKm > farthestTripKm) {
        farthestTripKm = tripKm;
        farthestTripStart = date ?? "";
        farthestTripEnd = endDate ?? "";
      }
    }
  }

  // Compute totals
  const totalKm = ALL_MODES.reduce((sum, m) => sum + distanceByMode[m], 0);

  // Activity distribution (percentage)
  const activityDistribution: Record<string, number> = {};
  for (const m of ALL_MODES) {
    const pct = totalKm > 0 ? Math.round((distanceByMode[m] / totalKm) * 1000) / 10 : 0;
    if (pct > 0) activityDistribution[m] = pct;
  }

  // Yearly stats
  const allYears = new Set<number>();
  for (const y of yearVisits.keys()) allYears.add(y);
  for (const y of yearKm.keys()) allYears.add(y);
  const yearlyStats: YearlyStat[] = [...allYears]
    .sort((a, b) => a - b)
    .map((year) => {
      const km = Math.round(yearKm.get(year) ?? 0);
      const days = yearDaysTracked.get(year)?.size ?? 0;
      const modeKm = yearModeKm.get(year) ?? {};
      const topModeEntry = Object.entries(modeKm).sort(([, a], [, b]) => b - a)[0];
      return {
        year,
        visits: yearVisits.get(year) ?? 0,
        activities: yearActivities.get(year) ?? 0,
        totalKm: km,
        distanceByMode: Object.fromEntries(
          Object.entries(modeKm).map(([k, v]) => [k, Math.round(v)])
        ),
        uniquePlaces: yearUniquePlaces.get(year)?.size ?? 0,
        daysTracked: days,
        trips: yearTrips.get(year) ?? 0,
        timezones: yearTimezones.get(year)?.size ?? 0,
        topMode: topModeEntry ? topModeEntry[0] : "",
        kmPerDay: days > 0 ? Math.round(km / days) : 0,
        countries: [...(yearCountries.get(year) ?? [])].sort(),
      };
    });

  // Monthly stats
  const allMonths = new Set<string>();
  for (const m of monthVisits.keys()) allMonths.add(m);
  for (const m of monthKm.keys()) allMonths.add(m);
  const monthlyStats: MonthlyStat[] = [...allMonths]
    .sort()
    .map((month) => ({
      month,
      visits: monthVisits.get(month) ?? 0,
      activities: monthActivities.get(month) ?? 0,
      totalKm: Math.round(monthKm.get(month) ?? 0),
    }));

  // Records
  let busiestYear: RecordStats["busiestYear"] = null;
  let maxYearVisits = 0;
  for (const ys of yearlyStats) {
    if (ys.visits > maxYearVisits) {
      maxYearVisits = ys.visits;
      busiestYear = { year: ys.year, visits: ys.visits, distanceKm: ys.totalKm };
    }
  }

  let mostActiveDay: RecordStats["mostActiveDay"] = null;
  let maxDayAct = 0;
  for (const [d, count] of dayActivityCounts) {
    if (count > maxDayAct) {
      maxDayAct = count;
      mostActiveDay = { date: d, activities: count };
    }
  }

  return {
    processedAt: new Date().toISOString(),
    dataRange: { start: minDate, end: maxDate },
    distance: {
      totalKm: Math.round(totalKm),
      flying: Math.round(distanceByMode.flying),
      driving: Math.round(distanceByMode.driving),
      train: Math.round(distanceByMode.train),
      motorcycling: Math.round(distanceByMode.motorcycling),
      ferry: Math.round(distanceByMode.ferry),
      walking: Math.round(distanceByMode.walking),
      cycling: Math.round(distanceByMode.cycling),
      bus: Math.round(distanceByMode.bus),
      subway: Math.round(distanceByMode.subway),
      running: Math.round(distanceByMode.running),
      tram: Math.round(distanceByMode.tram),
      skiing: Math.round(distanceByMode.skiing),
      other: Math.round(distanceByMode.other),
    },
    counts: {
      totalVisits,
      uniquePlaces: uniquePlaces.size,
      totalActivities,
      totalTrips,
      totalDaysTracked: daysTracked.size,
      totalSegments: segments.length,
    },
    yearlyStats,
    monthlyStats,
    activityDistribution,
    records: {
      farthestTrip:
        farthestTripKm > 0
          ? { distanceKm: Math.round(farthestTripKm), startDate: farthestTripStart, endDate: farthestTripEnd }
          : null,
      busiestYear,
      mostActiveDay,
      longestFlight:
        longestFlightKm > 0 ? { distanceKm: Math.round(longestFlightKm), date: longestFlightDate } : null,
    },
  };
}

// ── Reviews processing ──

interface ReviewFeature {
  properties?: {
    date?: string;
    five_star_rating_published?: number;
    location?: {
      country_code?: string;
      name?: string;
    };
  };
}

export function processReviews(features: ReviewFeature[]): ReviewStats {
  const byCountry: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const ratingDistribution: Record<string, number> = {};
  let ratingSum = 0;
  let ratingCount = 0;

  for (const f of features) {
    const props = f.properties;
    if (!props) continue;

    // Country
    const cc = props.location?.country_code;
    if (cc) byCountry[cc] = (byCountry[cc] ?? 0) + 1;

    // Year
    if (props.date) {
      const year = extractYear(props.date);
      if (year) byYear[String(year)] = (byYear[String(year)] ?? 0) + 1;
    }

    // Rating (0 means "no rating published" — exclude from average)
    const rating = props.five_star_rating_published;
    if (rating != null) {
      ratingDistribution[String(rating)] = (ratingDistribution[String(rating)] ?? 0) + 1;
      if (rating > 0) {
        ratingSum += rating;
        ratingCount++;
      }
    }
  }

  return {
    total: features.length,
    countries: Object.keys(byCountry).length,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : 0,
    byCountry,
    byYear,
    ratingDistribution,
  };
}

// ── Photo processing ──

interface PhotoMeta {
  photoTakenTime?: { timestamp?: string };
  creationTime?: { timestamp?: string };
  geoDataExif?: { latitude?: number; longitude?: number };
}

// ── Heatmap extraction ──

interface FullPhotoMeta extends PhotoMeta {
  title?: string;
  description?: string;
  imageViews?: string;
}

interface RawReviewFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    date?: string;
    five_star_rating_published?: number;
    location?: { name?: string; country_code?: string };
    review_text_published?: string;
  };
}

export interface HeatmapProcessResult {
  heatPoints: { lat: number; lng: number; weight: number }[];
  topPhotos: {
    lat: number;
    lng: number;
    imageViews: number;
    title: string;
    description: string;
    date: string;
    originalFilename: string;
  }[];
  reviews: {
    lat: number;
    lng: number;
    name: string;
    rating: number;
    date: string;
    countryCode: string;
    text: string;
  }[];
  stats: {
    totalVisits: number;
    heatCells: number;
    totalPhotos: number;
    totalPhotoViews: number;
    topViewCount: number;
    totalReviews: number;
  };
}

export function extractHeatmapData(
  segments: RawSegment[],
  photoMetas: FullPhotoMeta[],
  reviewFeatures: RawReviewFeature[]
): HeatmapProcessResult {
  // 1. Build heatmap from timeline visit locations
  const gridCounts = new Map<string, number>();
  let visitCount = 0;

  for (const seg of segments) {
    if (!seg.visit?.topCandidate) continue;
    const semanticType = seg.visit.topCandidate.semanticType;
    if (semanticType === "HOME" || semanticType === "WORK") continue;

    const coords = parseLatLng(seg.visit.topCandidate.placeLocation?.latLng);
    if (!coords) continue;

    visitCount++;
    // Round to 1 decimal place (~11km grid)
    const gridKey = `${Math.round(coords[0] * 10) / 10},${Math.round(coords[1] * 10) / 10}`;
    gridCounts.set(gridKey, (gridCounts.get(gridKey) ?? 0) + 1);
  }

  const heatPoints = [...gridCounts.entries()].map(([key, weight]) => {
    const [lat, lng] = key.split(",").map(Number);
    return { lat, lng, weight };
  });

  // 2. Process photos — filter geotagged, sort by views
  const geoPhotos: {
    lat: number;
    lng: number;
    imageViews: number;
    title: string;
    description: string;
    date: string;
    originalFilename: string;
  }[] = [];

  let totalViews = 0;

  for (const m of photoMetas) {
    const views = parseInt(m.imageViews ?? "0", 10) || 0;
    totalViews += views;

    if (!m.geoDataExif?.latitude || m.geoDataExif.latitude === 0) continue;
    if (!m.geoDataExif?.longitude || m.geoDataExif.longitude === 0) continue;

    const ts = m.photoTakenTime?.timestamp ?? m.creationTime?.timestamp;
    let date = "";
    if (ts) {
      const epoch = parseInt(ts, 10);
      if (!isNaN(epoch)) {
        date = new Date(epoch * 1000).toISOString().split("T")[0];
      }
    }

    geoPhotos.push({
      lat: Math.round(m.geoDataExif.latitude * 10000) / 10000,
      lng: Math.round(m.geoDataExif.longitude * 10000) / 10000,
      imageViews: views,
      title: m.title ?? "",
      description: m.description ?? "",
      date,
      originalFilename: m.title ?? "",
    });
  }

  // Sort by views descending, take top 500
  geoPhotos.sort((a, b) => b.imageViews - a.imageViews);
  const topPhotos = geoPhotos.slice(0, 500);

  // 3. Process reviews — extract coordinates
  const reviews: HeatmapProcessResult["reviews"] = [];

  for (const f of reviewFeatures) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords; // GeoJSON is [lng, lat]
    if (lat === 0 && lng === 0) continue;

    const props = f.properties;
    const date = props?.date ? props.date.split("T")[0] : "";

    reviews.push({
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      name: props?.location?.name ?? "",
      rating: props?.five_star_rating_published ?? 0,
      date,
      countryCode: props?.location?.country_code ?? "",
      text: (props?.review_text_published ?? "").slice(0, 200),
    });
  }

  return {
    heatPoints,
    topPhotos,
    reviews,
    stats: {
      totalVisits: visitCount,
      heatCells: heatPoints.length,
      totalPhotos: geoPhotos.length,
      totalPhotoViews: totalViews,
      topViewCount: topPhotos[0]?.imageViews ?? 0,
      totalReviews: reviews.length,
    },
  };
}

export function processPhotos(metas: PhotoMeta[]): PhotoStats {
  const byYear: Record<string, number> = {};
  let geotagged = 0;
  let minTs = Infinity;
  let maxTs = -Infinity;

  for (const m of metas) {
    // Check geotagged
    if (m.geoDataExif && m.geoDataExif.latitude && m.geoDataExif.latitude !== 0) {
      geotagged++;
    }

    // Get timestamp
    const ts = m.photoTakenTime?.timestamp ?? m.creationTime?.timestamp;
    if (ts) {
      const epoch = parseInt(ts, 10);
      if (!isNaN(epoch)) {
        if (epoch < minTs) minTs = epoch;
        if (epoch > maxTs) maxTs = epoch;
        const d = new Date(epoch * 1000);
        const yr = String(d.getFullYear());
        byYear[yr] = (byYear[yr] ?? 0) + 1;
      }
    }
  }

  return {
    total: metas.length,
    geotagged,
    dateRange:
      minTs < Infinity
        ? {
            start: new Date(minTs * 1000).toISOString().split("T")[0],
            end: new Date(maxTs * 1000).toISOString().split("T")[0],
          }
        : null,
    byYear,
  };
}
