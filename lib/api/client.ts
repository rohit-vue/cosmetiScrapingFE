import type { LogEntry, Scraper } from "./types";

export type Unsubscribe = () => void;

export type RunFinishOutcome = "succeeded" | "failed" | "stopped";

export type RunFinishEvent = {
  runId: string;
  status: RunFinishOutcome;
  finishedAt: string;
};

export type ScraperFinishEvent = {
  runId: string;
  scraperId: string;
  scraperName: string;
  outcome: RunFinishOutcome;
  recordsFound: number | null;
  finishedAt: string;
};

export type RunOptions = {
  keywords?: string[];
  countries?: string[];
  targetSuppliers?: number;
};

export type ScraperClient = {
  list(): Promise<Scraper[]>;
  get(id: string): Promise<Scraper | undefined>;
  start(ids: string[], options?: RunOptions): Promise<void>;
  stop(ids: string[]): Promise<void>;
  subscribeLogs(scraperId: string, cb: (entries: LogEntry[]) => void): Unsubscribe;
  subscribeScrapers(cb: (scrapers: Scraper[]) => void): Unsubscribe;
  /** Optional: notified when a run reaches a terminal status. */
  onRunFinished?(cb: (event: RunFinishEvent) => void): Unsubscribe;
  /** Optional: notified once per (run, scraper) when a scraper inside the
   *  current run reaches a terminal status (succeeded / failed / stopped). */
  onScraperFinished?(cb: (event: ScraperFinishEvent) => void): Unsubscribe;
  /** Optional: returns the absolute URL to download a run's combined CSV. */
  combinedCsvUrl?(runId: string): string;
  /** Optional: returns the absolute URL to download one scraper's cleaned CSV
   *  for a given run. */
  scraperCleanedCsvUrl?(runId: string, scraperId: string): string;
  /** Optional: returns the absolute URL to download one scraper's raw CSV
   *  (final output) for a given run. */
  scraperRawCsvUrl?(runId: string, scraperId: string): string;
  /** Optional: returns the absolute URL to download one scraper's partial
   *  autosaved CSV for a given run. */
  scraperPartialCsvUrl?(runId: string, scraperId: string): string;
  /** Optional: returns the most recently finished run id (e.g. across reloads). */
  getLastFinishedRun?(): RunFinishEvent | null;
};
