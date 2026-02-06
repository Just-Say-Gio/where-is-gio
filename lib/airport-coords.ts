// Approximate airport coordinates for flight map visualization
// [latitude, longitude]
export const AIRPORT_COORDS: Record<string, [number, number]> = {
  // Thailand
  Bangkok: [13.69, 100.75],          // BKK
  Phuket: [8.11, 98.32],             // HKT

  // Taiwan
  "Taoyuan (Dayuan)": [25.08, 121.23], // TPE

  // Netherlands
  Amsterdam: [52.31, 4.76],           // AMS
  Eindhoven: [51.45, 5.37],           // EIN

  // United Kingdom
  London: [51.47, -0.46],             // LHR

  // Vietnam
  "Hanoi (Soc Son)": [21.22, 105.81], // HAN
  "Da Nang": [16.04, 108.20],         // DAD
  "Ho Chi Minh City": [10.82, 106.65],// SGN

  // Malaysia
  "Kuala Lumpur": [2.74, 101.70],     // KUL

  // India
  "New Delhi": [28.56, 77.10],        // DEL
  Mumbai: [19.09, 72.87],             // BOM

  // Oman
  Muscat: [23.59, 58.28],             // MCT

  // Bahrain
  Manama: [26.27, 50.63],             // BAH

  // Qatar
  Doha: [25.26, 51.57],               // DOH

  // Jordan
  Amman: [31.72, 35.99],              // AMM

  // Germany
  Düsseldorf: [51.29, 6.77],          // DUS
  "Frankfurt am Main": [50.03, 8.57], // FRA

  // Turkey
  "Pendik, Istanbul": [40.90, 29.31], // SAW

  // Saudi Arabia
  Riyadh: [24.96, 46.70],             // RUH

  // China
  "Shanghai (Pudong)": [31.14, 121.81], // PVG
  "Guangzhou (Huadu)": [23.39, 113.30], // CAN
  Beijing: [40.08, 116.58],             // PEK

  // France
  Paris: [49.01, 2.55],               // CDG

  // Spain
  Madrid: [40.47, -3.56],             // MAD

  // Portugal
  Porto: [41.24, -8.68],              // OPO

  // South Korea
  Seoul: [37.46, 126.44],             // ICN

  // United States
  Seattle: [47.45, -122.31],          // SEA
  Denver: [39.86, -104.67],           // DEN
  "New York": [40.64, -73.78],        // JFK
  "Los Angeles": [33.94, -118.41],    // LAX
  "Raleigh/Durham": [35.88, -78.79],  // RDU
  Dallas: [32.90, -97.04],            // DFW
  "Las Vegas": [36.08, -115.15],      // LAS
  Kalispell: [48.31, -114.26],        // FCA

  // Japan
  Tokyo: [35.55, 139.78],             // NRT

  // Philippines
  Manila: [14.51, 121.02],            // MNL

  // Singapore
  Singapore: [1.35, 103.99],          // SIN

  // Nepal
  Kathmandu: [27.70, 85.36],          // KTM

  // Bangladesh
  Dhaka: [23.84, 90.40],              // DAC

  // Czech Republic
  Prague: [50.10, 14.26],             // PRG

  // UAE
  Dubai: [25.25, 55.36],              // DXB
};
