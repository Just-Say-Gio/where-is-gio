import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { HostingData, HostingOverride } from "./types";

// Committed to git so it survives Railway deploys (unlike .cache/)
const HOSTING_FILE = join(process.cwd(), "hosting-overrides.json");

export function getHostingData(): HostingData {
  try {
    if (!existsSync(HOSTING_FILE)) return { overrides: {} };
    const raw = readFileSync(HOSTING_FILE, "utf-8");
    return JSON.parse(raw) as HostingData;
  } catch {
    return { overrides: {} };
  }
}

function saveHostingData(data: HostingData): void {
  try {
    writeFileSync(HOSTING_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write hosting overrides:", err);
  }
}

export function setHostingOverrides(
  dates: string[],
  reason: string
): void {
  const data = getHostingData();
  for (const date of dates) {
    data.overrides[date] = { available: false, reason };
  }
  saveHostingData(data);
}

export function removeHostingOverrides(dates: string[]): void {
  const data = getHostingData();
  for (const date of dates) {
    delete data.overrides[date];
  }
  saveHostingData(data);
}

export function getOverridesMap(): Record<string, HostingOverride> {
  return getHostingData().overrides;
}
