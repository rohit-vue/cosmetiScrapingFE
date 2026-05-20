export type ScraperStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "stopped";

export type LogLevel = "info" | "warn" | "error" | "success";

export type LogEntry = {
  id: string;
  ts: string;
  level: LogLevel;
  message: string;
};

export type RunSummary = {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  recordsFound?: number;
  errorMessage?: string;
  outcome: "succeeded" | "failed" | "stopped";
};

export type Scraper = {
  id: string;
  name: string;
  domain: string;
  scriptFile: string;
  keywords: string[];
  countries: string[];
  manualKeywords?: string[];
  manualCountries?: string[];
  outputCsv: string;
  cleanedCsv?: string;
  status: ScraperStatus;
  progress: number;
  lastRun?: RunSummary;
  recentRuns: RunSummary[];
};
