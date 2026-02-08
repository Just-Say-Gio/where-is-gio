import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { RiceRunData, RiceRunEntry } from "./types";

// Committed to git so it survives Railway deploys (unlike .cache/)
const RICE_RUNS_FILE = join(process.cwd(), "rice-runs.json");

export function getRiceRunData(): RiceRunData {
  try {
    if (!existsSync(RICE_RUNS_FILE)) return { riceRuns: {} };
    const raw = readFileSync(RICE_RUNS_FILE, "utf-8");
    return JSON.parse(raw) as RiceRunData;
  } catch {
    return { riceRuns: {} };
  }
}

function saveRiceRunData(data: RiceRunData): void {
  try {
    writeFileSync(RICE_RUNS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write rice runs:", err);
  }
}

export function setRiceRuns(dates: string[], note?: string): void {
  const data = getRiceRunData();
  for (const date of dates) {
    data.riceRuns[date] = { note };
  }
  saveRiceRunData(data);
}

export function removeRiceRuns(dates: string[]): void {
  const data = getRiceRunData();
  for (const date of dates) {
    delete data.riceRuns[date];
  }
  saveRiceRunData(data);
}

export function getRiceRunsMap(): Record<string, RiceRunEntry> {
  return getRiceRunData().riceRuns;
}
