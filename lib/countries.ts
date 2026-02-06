export interface CountryInfo {
  name: string;
  code: string;
  color: string;
  flag: string;
}

export const COUNTRY_MAP: Record<string, CountryInfo> = {
  US: {
    name: "United States",
    code: "US",
    color: "#3B82F6",
    flag: "\u{1F1FA}\u{1F1F8}",
  },
  TH: {
    name: "Thailand",
    code: "TH",
    color: "#F97316",
    flag: "\u{1F1F9}\u{1F1ED}",
  },
  SG: {
    name: "Singapore",
    code: "SG",
    color: "#8B5CF6",
    flag: "\u{1F1F8}\u{1F1EC}",
  },
  IN: {
    name: "India",
    code: "IN",
    color: "#10B981",
    flag: "\u{1F1EE}\u{1F1F3}",
  },
  GB: {
    name: "United Kingdom",
    code: "GB",
    color: "#EF4444",
    flag: "\u{1F1EC}\u{1F1E7}",
  },
  CZ: {
    name: "Czech Republic",
    code: "CZ",
    color: "#06B6D4",
    flag: "\u{1F1E8}\u{1F1FF}",
  },
  NL: {
    name: "Netherlands",
    code: "NL",
    color: "#84CC16",
    flag: "\u{1F1F3}\u{1F1F1}",
  },
  PE: {
    name: "Peru",
    code: "PE",
    color: "#EC4899",
    flag: "\u{1F1F5}\u{1F1EA}",
  },
  BR: {
    name: "Brazil",
    code: "BR",
    color: "#14B8A6",
    flag: "\u{1F1E7}\u{1F1F7}",
  },
  MX: {
    name: "Mexico",
    code: "MX",
    color: "#6366F1",
    flag: "\u{1F1F2}\u{1F1FD}",
  },
  IT: {
    name: "Italy",
    code: "IT",
    color: "#FBBF24",
    flag: "\u{1F1EE}\u{1F1F9}",
  },
  DE: {
    name: "Germany",
    code: "DE",
    color: "#D946EF",
    flag: "\u{1F1E9}\u{1F1EA}",
  },
  HK: {
    name: "Hong Kong",
    code: "HK",
    color: "#F43F5E",
    flag: "\u{1F1ED}\u{1F1F0}",
  },
  // Flight analytics countries
  TW: {
    name: "Taiwan",
    code: "TW",
    color: "#0EA5E9",
    flag: "\u{1F1F9}\u{1F1FC}",
  },
  VN: {
    name: "Vietnam",
    code: "VN",
    color: "#DC2626",
    flag: "\u{1F1FB}\u{1F1F3}",
  },
  MY: {
    name: "Malaysia",
    code: "MY",
    color: "#7C3AED",
    flag: "\u{1F1F2}\u{1F1FE}",
  },
  OM: {
    name: "Oman",
    code: "OM",
    color: "#059669",
    flag: "\u{1F1F4}\u{1F1F2}",
  },
  BH: {
    name: "Bahrain",
    code: "BH",
    color: "#E11D48",
    flag: "\u{1F1E7}\u{1F1ED}",
  },
  QA: {
    name: "Qatar",
    code: "QA",
    color: "#7E22CE",
    flag: "\u{1F1F6}\u{1F1E6}",
  },
  JO: {
    name: "Jordan",
    code: "JO",
    color: "#B45309",
    flag: "\u{1F1EF}\u{1F1F4}",
  },
  TR: {
    name: "Turkey",
    code: "TR",
    color: "#BE123C",
    flag: "\u{1F1F9}\u{1F1F7}",
  },
  SA: {
    name: "Saudi Arabia",
    code: "SA",
    color: "#15803D",
    flag: "\u{1F1F8}\u{1F1E6}",
  },
  CN: {
    name: "China",
    code: "CN",
    color: "#B91C1C",
    flag: "\u{1F1E8}\u{1F1F3}",
  },
  FR: {
    name: "France",
    code: "FR",
    color: "#2563EB",
    flag: "\u{1F1EB}\u{1F1F7}",
  },
  ES: {
    name: "Spain",
    code: "ES",
    color: "#EA580C",
    flag: "\u{1F1EA}\u{1F1F8}",
  },
  PT: {
    name: "Portugal",
    code: "PT",
    color: "#16A34A",
    flag: "\u{1F1F5}\u{1F1F9}",
  },
  KR: {
    name: "South Korea",
    code: "KR",
    color: "#4F46E5",
    flag: "\u{1F1F0}\u{1F1F7}",
  },
  JP: {
    name: "Japan",
    code: "JP",
    color: "#E879F9",
    flag: "\u{1F1EF}\u{1F1F5}",
  },
  PH: {
    name: "Philippines",
    code: "PH",
    color: "#0284C7",
    flag: "\u{1F1F5}\u{1F1ED}",
  },
  NP: {
    name: "Nepal",
    code: "NP",
    color: "#9333EA",
    flag: "\u{1F1F3}\u{1F1F5}",
  },
  BD: {
    name: "Bangladesh",
    code: "BD",
    color: "#047857",
    flag: "\u{1F1E7}\u{1F1E9}",
  },
  AE: {
    name: "UAE",
    code: "AE",
    color: "#CA8A04",
    flag: "\u{1F1E6}\u{1F1EA}",
  },
  // Visited countries (from Skratch map)
  EG: { name: "Egypt", code: "EG", color: "#D97706", flag: "\u{1F1EA}\u{1F1EC}" },
  TZ: { name: "Tanzania", code: "TZ", color: "#65A30D", flag: "\u{1F1F9}\u{1F1FF}" },
  CR: { name: "Costa Rica", code: "CR", color: "#0D9488", flag: "\u{1F1E8}\u{1F1F7}" },
  DO: { name: "Dominican Republic", code: "DO", color: "#7C2D12", flag: "\u{1F1E9}\u{1F1F4}" },
  CW: { name: "Curacao", code: "CW", color: "#1D4ED8", flag: "\u{1F1E8}\u{1F1FC}" },
  KH: { name: "Cambodia", code: "KH", color: "#92400E", flag: "\u{1F1F0}\u{1F1ED}" },
  ID: { name: "Indonesia", code: "ID", color: "#DC2626", flag: "\u{1F1EE}\u{1F1E9}" },
  MO: { name: "Macau", code: "MO", color: "#059669", flag: "\u{1F1F2}\u{1F1F4}" },
  AT: { name: "Austria", code: "AT", color: "#B91C1C", flag: "\u{1F1E6}\u{1F1F9}" },
  BE: { name: "Belgium", code: "BE", color: "#CA8A04", flag: "\u{1F1E7}\u{1F1EA}" },
  BA: { name: "Bosnia and Herzegovina", code: "BA", color: "#1E40AF", flag: "\u{1F1E7}\u{1F1E6}" },
  HR: { name: "Croatia", code: "HR", color: "#0369A1", flag: "\u{1F1ED}\u{1F1F7}" },
  DK: { name: "Denmark", code: "DK", color: "#BE123C", flag: "\u{1F1E9}\u{1F1F0}" },
  HU: { name: "Hungary", code: "HU", color: "#15803D", flag: "\u{1F1ED}\u{1F1FA}" },
  LU: { name: "Luxembourg", code: "LU", color: "#0891B2", flag: "\u{1F1F1}\u{1F1FA}" },
  MC: { name: "Monaco", code: "MC", color: "#BE185D", flag: "\u{1F1F2}\u{1F1E8}" },
  ME: { name: "Montenegro", code: "ME", color: "#B45309", flag: "\u{1F1F2}\u{1F1EA}" },
  NO: { name: "Norway", code: "NO", color: "#1E3A8A", flag: "\u{1F1F3}\u{1F1F4}" },
  PL: { name: "Poland", code: "PL", color: "#DC2626", flag: "\u{1F1F5}\u{1F1F1}" },
  SK: { name: "Slovakia", code: "SK", color: "#1D4ED8", flag: "\u{1F1F8}\u{1F1F0}" },
  SI: { name: "Slovenia", code: "SI", color: "#0F766E", flag: "\u{1F1F8}\u{1F1EE}" },
  SE: { name: "Sweden", code: "SE", color: "#CA8A04", flag: "\u{1F1F8}\u{1F1EA}" },
  CH: { name: "Switzerland", code: "CH", color: "#DC2626", flag: "\u{1F1E8}\u{1F1ED}" },
  CA: { name: "Canada", code: "CA", color: "#DC2626", flag: "\u{1F1E8}\u{1F1E6}" },
};

const FALLBACK_COLORS = [
  "#6C5CE7",
  "#00CEC9",
  "#FD79A8",
  "#E17055",
  "#00B894",
  "#FDCB6E",
  "#A29BFE",
  "#55EFC4",
];

let dynamicColorIndex = 0;

export function getCountryInfo(code: string): CountryInfo {
  if (COUNTRY_MAP[code]) {
    return COUNTRY_MAP[code];
  }

  // Generate a stable entry for unknown country codes
  const color = FALLBACK_COLORS[dynamicColorIndex % FALLBACK_COLORS.length];
  dynamicColorIndex++;

  const info: CountryInfo = {
    name: code,
    code,
    color,
    flag: "\u{1F30D}", // globe emoji
  };

  COUNTRY_MAP[code] = info;
  return info;
}

export const UNKNOWN_COLOR = "#CBD5E1";
