import { FlightRecord } from "./types";

export const CITY_COUNTRY_MAP: Record<string, string> = {
  // Thailand
  Bangkok: "TH",
  Phuket: "TH",

  // Taiwan
  "Taoyuan (Dayuan)": "TW",

  // Netherlands
  Amsterdam: "NL",
  Eindhoven: "NL",

  // United Kingdom
  London: "GB",

  // Vietnam
  "Hanoi (Soc Son)": "VN",
  "Da Nang": "VN",
  "Ho Chi Minh City": "VN",

  // Malaysia
  "Kuala Lumpur": "MY",

  // India
  "New Delhi": "IN",
  Mumbai: "IN",

  // Oman
  Muscat: "OM",

  // Bahrain
  Manama: "BH",

  // Qatar
  Doha: "QA",

  // Jordan
  Amman: "JO",

  // Germany
  Düsseldorf: "DE",
  "Frankfurt am Main": "DE",

  // Turkey
  "Pendik, Istanbul": "TR",

  // Saudi Arabia
  Riyadh: "SA",

  // China
  "Shanghai (Pudong)": "CN",
  "Guangzhou (Huadu)": "CN",
  Beijing: "CN",

  // France
  Paris: "FR",

  // Spain
  Madrid: "ES",

  // Portugal
  Porto: "PT",

  // South Korea
  Seoul: "KR",

  // United States
  Seattle: "US",
  Denver: "US",
  "New York": "US",
  "Los Angeles": "US",
  "Raleigh/Durham": "US",
  Dallas: "US",
  "Las Vegas": "US",
  Kalispell: "US",

  // Japan
  Tokyo: "JP",

  // Philippines
  Manila: "PH",

  // Singapore
  Singapore: "SG",

  // Nepal
  Kathmandu: "NP",

  // Bangladesh
  Dhaka: "BD",

  // Czech Republic
  Prague: "CZ",

  // UAE
  Dubai: "AE",
};

export function getCountryFromCity(city: string): string {
  return CITY_COUNTRY_MAP[city] ?? "XX";
}

export function getAllCountriesFromFlights(flights: FlightRecord[]): string[] {
  const countries = new Set<string>();
  for (const f of flights) {
    const start = getCountryFromCity(f.startCity);
    const dest = getCountryFromCity(f.destinationCity);
    if (start !== "XX") countries.add(start);
    if (dest !== "XX") countries.add(dest);
  }
  return [...countries].sort();
}
