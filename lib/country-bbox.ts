/**
 * Lightweight coordinate → country code lookup using bounding boxes + nearest centroid.
 * Covers ~100 countries. For overlapping bboxes, picks the country whose centroid is closest.
 * Good enough for yearly stats — not a precision geocoder.
 */

// [code, minLat, maxLat, minLng, maxLng, centLat, centLng]
type BBox = [string, number, number, number, number, number, number];

const BBOXES: BBox[] = [
  // Southeast Asia
  ["TH", 5.6, 20.5, 97.3, 105.6, 13.0, 101.0],
  ["VN", 8.4, 23.4, 102.1, 109.5, 16.0, 106.0],
  ["KH", 10.0, 14.7, 102.3, 107.6, 12.5, 105.0],
  ["MY", 0.9, 7.4, 99.6, 119.3, 4.2, 108.0],
  ["SG", 1.2, 1.5, 103.6, 104.0, 1.35, 103.8],
  ["ID", -11.0, 6.1, 95.0, 141.0, -2.5, 118.0],
  ["PH", 4.6, 21.1, 116.9, 126.6, 12.9, 121.8],
  ["MM", 9.8, 28.5, 92.2, 101.2, 19.8, 96.7],
  ["LA", 13.9, 22.5, 100.1, 107.7, 18.2, 103.8],

  // East Asia
  ["CN", 18.2, 53.6, 73.5, 135.1, 35.9, 104.2],
  ["TW", 21.9, 25.3, 120.0, 122.0, 23.7, 121.0],
  ["JP", 24.3, 45.5, 122.9, 153.0, 36.2, 138.3],
  ["KR", 33.1, 38.6, 124.6, 131.9, 35.9, 127.8],
  ["HK", 22.15, 22.56, 113.84, 114.41, 22.3, 114.2],
  ["MO", 22.11, 22.22, 113.53, 113.60, 22.17, 113.56],
  ["MN", 41.6, 52.1, 87.8, 119.9, 46.9, 103.8],

  // South Asia
  ["IN", 6.7, 35.5, 68.1, 97.4, 20.6, 79.0],
  ["NP", 26.3, 30.4, 80.1, 88.2, 28.4, 84.1],
  ["BD", 20.7, 26.6, 88.0, 92.7, 23.7, 90.4],
  ["LK", 5.9, 9.8, 79.7, 81.9, 7.9, 80.8],
  ["PK", 23.7, 37.1, 60.9, 77.8, 30.4, 69.3],

  // Middle East
  ["AE", 22.6, 26.1, 51.6, 56.4, 24.5, 54.0],
  ["OM", 16.6, 26.4, 52.0, 59.8, 21.5, 56.0],
  ["QA", 24.5, 26.2, 50.7, 51.7, 25.3, 51.2],
  ["BH", 25.8, 26.3, 50.4, 50.7, 26.05, 50.55],
  ["SA", 16.4, 32.2, 34.5, 55.7, 24.3, 45.1],
  ["JO", 29.2, 33.4, 34.9, 39.3, 31.3, 37.1],
  ["TR", 36.0, 42.1, 26.0, 44.8, 39.1, 35.4],
  ["IL", 29.5, 33.3, 34.3, 35.9, 31.4, 35.1],
  ["LB", 33.1, 34.7, 35.1, 36.6, 33.9, 35.9],
  ["IQ", 29.1, 37.4, 38.8, 48.6, 33.2, 43.7],
  ["IR", 25.1, 39.8, 44.0, 63.3, 32.4, 53.7],
  ["KW", 28.5, 30.1, 46.6, 48.4, 29.3, 47.5],
  ["EG", 22.0, 31.7, 24.7, 36.9, 26.8, 30.8],

  // Europe
  ["NL", 50.8, 53.5, 3.4, 7.2, 52.1, 5.3],
  ["BE", 49.5, 51.5, 2.5, 6.4, 50.5, 4.5],
  ["LU", 49.4, 50.2, 5.7, 6.5, 49.8, 6.1],
  ["DE", 47.3, 55.1, 5.9, 15.0, 51.2, 10.4],
  ["FR", 41.4, 51.1, -5.1, 9.6, 46.2, 2.2],
  ["ES", 36.0, 43.8, -9.3, 4.3, 40.0, -3.7],
  ["PT", 36.9, 42.2, -9.5, -6.2, 39.6, -8.0],
  ["IT", 36.6, 47.1, 6.6, 18.5, 41.9, 12.6],
  ["CH", 45.8, 47.8, 6.0, 10.5, 46.8, 8.2],
  ["AT", 46.4, 49.0, 9.5, 17.2, 47.7, 13.3],
  ["CZ", 48.6, 51.1, 12.1, 18.9, 49.8, 15.5],
  ["SK", 47.7, 49.6, 16.8, 22.6, 48.7, 19.7],
  ["HU", 45.7, 48.6, 16.1, 22.9, 47.2, 19.5],
  ["PL", 49.0, 54.8, 14.1, 24.1, 51.9, 19.1],
  ["HR", 42.4, 46.6, 13.5, 19.4, 44.5, 16.5],
  ["SI", 45.4, 46.9, 13.4, 16.6, 46.2, 15.0],
  ["BA", 42.6, 45.3, 15.7, 19.6, 44.0, 17.7],
  ["ME", 41.9, 43.6, 18.4, 20.4, 42.7, 19.4],
  ["RS", 42.2, 46.2, 18.8, 23.0, 44.2, 20.9],
  ["GB", 49.9, 60.9, -8.2, 1.8, 55.4, -3.4],
  ["IE", 51.4, 55.4, -10.5, -6.0, 53.4, -8.2],
  ["DK", 54.6, 57.8, 8.1, 15.2, 56.2, 11.6],
  ["NO", 58.0, 71.2, 4.6, 31.1, 64.6, 17.8],
  ["SE", 55.3, 69.1, 11.1, 24.2, 62.2, 17.6],
  ["FI", 60.0, 70.1, 20.6, 31.6, 65.0, 26.0],
  ["GR", 34.8, 41.7, 19.4, 29.6, 38.3, 24.5],
  ["RO", 43.6, 48.3, 20.3, 30.0, 46.0, 25.0],
  ["BG", 41.2, 44.2, 22.4, 28.6, 42.7, 25.5],
  ["MC", 43.72, 43.76, 7.41, 7.44, 43.74, 7.42],

  // Americas
  ["US", 24.5, 49.4, -124.8, -66.9, 37.0, -95.7],
  ["US", 51.2, 71.4, -179.2, -129.0, 64.2, -153.0],  // Alaska
  ["CA", 41.7, 83.1, -141.0, -52.6, 56.1, -106.3],
  ["MX", 14.5, 32.7, -118.4, -86.7, 23.6, -102.6],
  ["CR", 8.0, 11.2, -85.9, -82.6, 9.6, -84.2],
  ["DO", 17.5, 19.9, -72.0, -68.3, 18.7, -70.2],
  ["CW", 12.0, 12.4, -69.2, -68.7, 12.2, -69.0],
  ["BR", -33.8, 5.3, -73.9, -34.8, -14.2, -51.9],
  ["PE", -18.4, -0.0, -81.3, -68.7, -9.2, -75.0],
  ["CO", -4.2, 13.4, -79.0, -66.9, 4.6, -73.0],
  ["AR", -55.1, -21.8, -73.6, -53.6, -38.4, -63.6],
  ["CL", -56.0, -17.5, -75.6, -66.4, -36.8, -71.0],

  // Africa
  ["TZ", -11.7, -1.0, 29.3, 40.4, -6.4, 34.9],
  ["KE", -4.7, 5.0, 33.9, 41.9, 0.0, 38.0],
  ["ZA", -34.8, -22.1, 16.5, 32.9, -28.5, 24.7],
  ["MA", 27.7, 35.9, -13.2, -1.0, 31.8, -7.1],

  // Oceania
  ["AU", -43.6, -10.7, 113.2, 153.6, -27.0, 133.4],
  ["NZ", -47.3, -34.4, 166.4, 178.5, -40.9, 172.5],
];

// Squared distance (no need for sqrt — just comparing)
function distSq(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}

/**
 * US/Canada border latitude by longitude (piecewise linear approximation).
 * The border follows 49°N in the west but dips to ~42°N at the Great Lakes.
 */
function usCaBorderLat(lng: number): number {
  if (lng <= -95) return 49.0;   // Western border: 49th parallel
  if (lng <= -82) return 48.0;   // Minnesota / upper Michigan
  if (lng <= -79) return 42.5;   // Southern Ontario dip (Great Lakes)
  if (lng <= -75) return 44.0;   // Eastern Ontario / St Lawrence
  return 45.5;                   // Quebec / Maine / New Brunswick
}

/**
 * Map a lat/lng coordinate to an ISO-2 country code.
 * Returns null if no match found.
 */
export function coordToCountry(lat: number, lng: number): string | null {
  const matches: BBox[] = [];

  for (const bb of BBOXES) {
    const [, minLat, maxLat, minLng, maxLng] = bb;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      matches.push(bb);
    }
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0][0];

  // Special case: US/CA overlap — use piecewise border latitude
  const codes = new Set(matches.map((m) => m[0]));
  if (codes.has("US") && codes.has("CA")) {
    const border = usCaBorderLat(lng);
    return lat >= border ? "CA" : "US";
  }

  // Multiple matches → pick closest centroid
  let best = matches[0];
  let bestDist = distSq(lat, lng, best[5], best[6]);
  for (let i = 1; i < matches.length; i++) {
    const d = distSq(lat, lng, matches[i][5], matches[i][6]);
    if (d < bestDist) {
      bestDist = d;
      best = matches[i];
    }
  }
  return best[0];
}
