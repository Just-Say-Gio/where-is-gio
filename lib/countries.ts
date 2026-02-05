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
