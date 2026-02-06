// City-to-coordinate mapping for GioLocator
// Covers travel segment cities + common destinations
// [latitude, longitude]

export const CITY_COORDS: Record<string, [number, number]> = {
  // Thailand
  "Hua Hin": [12.57, 99.96],
  Bangkok: [13.76, 100.50],
  "Chiang Mai": [18.79, 98.98],
  Phuket: [7.88, 98.39],
  "Koh Samui": [9.51, 100.06],
  Pattaya: [12.93, 100.87],

  // Europe
  Prague: [50.08, 14.44],
  Amsterdam: [52.37, 4.90],
  London: [51.51, -0.13],
  Paris: [48.86, 2.35],
  Madrid: [40.42, -3.70],
  Porto: [41.16, -8.63],
  Düsseldorf: [51.23, 6.78],
  Frankfurt: [50.11, 8.68],
  "Frankfurt am Main": [50.11, 8.68],
  Istanbul: [41.01, 28.98],
  Budapest: [47.50, 19.04],
  Vienna: [48.21, 16.37],
  Brussels: [50.85, 4.35],
  Copenhagen: [55.68, 12.57],
  Stockholm: [59.33, 18.07],
  Oslo: [59.91, 10.75],
  Zurich: [47.38, 8.54],
  Monaco: [43.74, 7.43],
  Ljubljana: [46.06, 14.51],
  Zagreb: [45.81, 15.98],
  Sarajevo: [43.86, 18.41],
  Bratislava: [48.15, 17.11],
  Warsaw: [52.23, 21.01],

  // Asia
  Singapore: [1.35, 103.82],
  "Kuala Lumpur": [3.14, 101.69],
  "Ho Chi Minh City": [10.82, 106.63],
  Hanoi: [21.03, 105.85],
  "Da Nang": [16.05, 108.22],
  Tokyo: [35.68, 139.69],
  Seoul: [37.57, 126.98],
  Shanghai: [31.23, 121.47],
  Beijing: [39.90, 116.40],
  "Hong Kong": [22.32, 114.17],
  Taipei: [25.03, 121.57],
  Manila: [14.60, 120.98],
  "Siem Reap": [13.36, 103.86],
  "Phnom Penh": [11.56, 104.93],
  Bali: [-8.34, 115.09],
  Jakarta: [-6.21, 106.85],
  Macau: [22.20, 113.54],
  Kathmandu: [27.72, 85.32],
  Dhaka: [23.81, 90.41],

  // Middle East
  Dubai: [25.20, 55.27],
  Doha: [25.29, 51.53],
  Muscat: [23.59, 58.54],
  Manama: [26.23, 50.59],
  Amman: [31.95, 35.93],
  Riyadh: [24.69, 46.72],

  // India
  "New Delhi": [28.61, 77.21],
  Mumbai: [19.08, 72.88],

  // Americas
  "New York": [40.71, -74.01],
  "Los Angeles": [34.05, -118.24],
  Seattle: [47.61, -122.33],
  Denver: [39.74, -104.99],
  Dallas: [32.78, -96.80],
  "Las Vegas": [36.17, -115.14],
  Kalispell: [48.20, -114.31],
  "Whitefish": [48.41, -114.35],
  Lima: [-12.05, -77.04],
  "Mexico City": [19.43, -99.13],
  "San José": [9.93, -84.08],
  "Punta Cana": [18.58, -68.37],

  // Africa
  Cairo: [30.04, 31.24],
  "Dar es Salaam": [-6.79, 39.28],
};

// Fallback: country center coordinates (keyed by ISO 2-letter code)
export const COUNTRY_CENTER: Record<string, [number, number]> = {
  TH: [13.76, 100.50],
  US: [39.83, -98.58],
  GB: [55.38, -3.44],
  NL: [52.13, 5.29],
  CZ: [49.82, 15.47],
  SG: [1.35, 103.82],
  IN: [20.59, 78.96],
  DE: [51.17, 10.45],
  FR: [46.23, 2.21],
  ES: [40.46, -3.75],
  PT: [39.40, -8.22],
  IT: [41.87, 12.57],
  TR: [38.96, 35.24],
  JP: [36.20, 138.25],
  KR: [35.91, 127.77],
  CN: [35.86, 104.20],
  HK: [22.40, 114.11],
  TW: [23.70, 120.96],
  VN: [14.06, 108.28],
  MY: [4.21, 101.98],
  PH: [12.88, 121.77],
  AE: [23.42, 53.85],
  QA: [25.35, 51.18],
  OM: [21.47, 55.98],
  BH: [26.07, 50.56],
  JO: [30.59, 36.24],
  SA: [23.89, 45.08],
  PE: [-9.19, -75.02],
  BR: [-14.24, -51.93],
  MX: [23.63, -102.55],
  EG: [26.82, 30.80],
  TZ: [-6.37, 34.89],
  CR: [9.75, -83.75],
  DO: [18.74, -70.16],
  CW: [12.17, -68.98],
  KH: [12.57, 104.99],
  ID: [-0.79, 113.92],
  MO: [22.20, 113.55],
  AT: [47.52, 14.55],
  BE: [50.50, 4.47],
  BA: [43.92, 17.68],
  HR: [45.10, 15.20],
  DK: [56.26, 9.50],
  HU: [47.16, 19.50],
  LU: [49.82, 6.13],
  MC: [43.74, 7.42],
  ME: [42.71, 19.37],
  NO: [60.47, 8.47],
  PL: [51.92, 19.15],
  SK: [48.67, 19.70],
  SI: [46.15, 14.99],
  SE: [60.13, 18.64],
  CH: [46.82, 8.23],
  CA: [56.13, -106.35],
  NP: [28.39, 84.12],
  BD: [23.68, 90.36],
};

/**
 * Look up coordinates for a city name, with country code fallback.
 * Tries exact match first, then partial match, then country center.
 */
export function getCityCoords(
  city?: string,
  countryCode?: string
): [number, number] | null {
  // Exact city match
  if (city && CITY_COORDS[city]) {
    return CITY_COORDS[city];
  }

  // Partial match: check if city name contains or is contained by a known key
  if (city) {
    const cityLower = city.toLowerCase();
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (
        cityLower.includes(key.toLowerCase()) ||
        key.toLowerCase().includes(cityLower)
      ) {
        return coords;
      }
    }
  }

  // Country center fallback
  if (countryCode && COUNTRY_CENTER[countryCode]) {
    return COUNTRY_CENTER[countryCode];
  }

  return null;
}
