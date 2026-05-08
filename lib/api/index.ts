// import { mockScraperClient } from "./mock";
import { httpScraperClient } from "./http";

/** Swap this export when the real backend API is ready. */
const useMock =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mock") === "1";

export const api = useMock ? httpScraperClient : httpScraperClient;

export type { ScraperClient } from "./client";
export type {
  LogEntry,
  LogLevel,
  RunSummary,
  Scraper,
  ScraperStatus,
} from "./types";
