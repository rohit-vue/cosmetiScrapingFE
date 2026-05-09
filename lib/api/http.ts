import type {
  RunFinishEvent,
  RunFinishOutcome,
  RunOptions,
  ScraperClient,
  ScraperFinishEvent,
} from "./client";
import type { LogEntry, Scraper } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const ACTIVE_RUN_KEY = "cosmetic.activeRunId";
const LAST_FINISHED_RUN_KEY = "cosmetic.lastFinishedRun";
const ANNOUNCED_SCRAPER_KEY = "cosmetic.announcedScraperFinishes";
const ANNOUNCED_SCRAPER_CAP = 200;

let currentRunId: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_RUN_KEY) : null;
let currentScrapers: Scraper[] = [];
let stateEs: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastFinishedRun: RunFinishEvent | null = readLastFinishedRun();
const scraperSubscribers = new Set<(scrapers: Scraper[]) => void>();
const runListeners = new Set<() => void>();
const finishListeners = new Set<(event: RunFinishEvent) => void>();
const scraperFinishListeners = new Set<(event: ScraperFinishEvent) => void>();
const announcedRunFinishes = new Set<string>();
let announcedScraperFinishes: string[] = readAnnouncedScraperFinishes();
if (lastFinishedRun) announcedRunFinishes.add(lastFinishedRun.runId);

function readLastFinishedRun(): RunFinishEvent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_FINISHED_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunFinishEvent;
    if (!parsed?.runId || !parsed?.status) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setLastFinishedRun(event: RunFinishEvent | null) {
  lastFinishedRun = event;
  if (typeof window === "undefined") return;
  if (event) {
    window.localStorage.setItem(LAST_FINISHED_RUN_KEY, JSON.stringify(event));
  } else {
    window.localStorage.removeItem(LAST_FINISHED_RUN_KEY);
  }
}

function announceRunFinish(runId: string, status: RunFinishOutcome) {
  if (announcedRunFinishes.has(runId)) return;
  announcedRunFinishes.add(runId);
  const event: RunFinishEvent = {
    runId,
    status,
    finishedAt: new Date().toISOString(),
  };
  setLastFinishedRun(event);
  for (const cb of finishListeners) cb(event);
}

function readAnnouncedScraperFinishes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ANNOUNCED_SCRAPER_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, ANNOUNCED_SCRAPER_CAP) : [];
  } catch {
    return [];
  }
}

function persistAnnouncedScraperFinishes() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ANNOUNCED_SCRAPER_KEY,
      JSON.stringify(announcedScraperFinishes.slice(0, ANNOUNCED_SCRAPER_CAP))
    );
  } catch {
    /* noop */
  }
}

function maybeAnnounceScraperFinish(payload: {
  runId: string;
  scraperId: string;
  scraperName: string;
  outcome: RunFinishOutcome;
  recordsFound: number | null;
}) {
  const key = `${payload.runId}:${payload.scraperId}:${payload.outcome}`;
  if (announcedScraperFinishes.includes(key)) return;
  announcedScraperFinishes = [key, ...announcedScraperFinishes].slice(
    0,
    ANNOUNCED_SCRAPER_CAP
  );
  persistAnnouncedScraperFinishes();
  const event: ScraperFinishEvent = {
    ...payload,
    finishedAt: new Date().toISOString(),
  };
  for (const cb of scraperFinishListeners) cb(event);
}

type ScraperWire = Omit<Scraper, "lastRun" | "recentRuns"> & {
  lastRun?: Scraper["lastRun"];
  recentRuns?: Scraper["recentRuns"];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function notifyScrapers() {
  const snap = [...currentScrapers];
  for (const cb of scraperSubscribers) cb(snap);
}

function emitRunChanged() {
  for (const cb of runListeners) cb();
}

function setCurrentRunId(runId: string | null) {
  currentRunId = runId;
  if (typeof window !== "undefined") {
    if (runId) window.localStorage.setItem(ACTIVE_RUN_KEY, runId);
    else window.localStorage.removeItem(ACTIVE_RUN_KEY);
  }
}

function closeStateStream() {
  stateEs?.close();
  stateEs = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

const SCRAPER_TERMINAL = new Set<string>(["succeeded", "failed", "stopped"]);

function connectStateStream() {
  closeStateStream();
  if (!currentRunId) return;

  const runIdAtConnect = currentRunId;
  stateEs = new EventSource(`${API_BASE}/api/runs/${currentRunId}/state`);
  stateEs.onmessage = (evt) => {
    const payload = JSON.parse(evt.data) as {
      run_id?: string | null;
      scrapers?: ScraperWire[];
      run_status?: string;
      run_scraper_ids?: string[];
    };

    if (payload.run_status === "unknown") {
      // Stale run id (server restarted, or run no longer tracked).
      // Clear it so we don't reconnect-loop, and fall back to /api/scrapers polling on demand.
      setCurrentRunId(null);
      closeStateStream();
      emitRunChanged();
      void httpScraperClient.list();
      return;
    }

    if (Array.isArray(payload.scrapers) && payload.scrapers.length > 0) {
      currentScrapers = payload.scrapers.map(toScraper);
      notifyScrapers();
    }

    // Per-scraper finish events: only consider scrapers that are part of THIS
    // run (so we don't re-fire for scrapers left in a terminal state from a
    // previous run). Dedup is keyed by runId:scraperId:outcome and persisted
    // to localStorage, so reloads / reconnects don't trigger duplicate
    // downloads.
    if (Array.isArray(payload.scrapers) && Array.isArray(payload.run_scraper_ids)) {
      const runScraperIds = new Set(payload.run_scraper_ids);
      const runIdForEvents = payload.run_id || runIdAtConnect;
      for (const s of payload.scrapers) {
        if (!runScraperIds.has(s.id)) continue;
        if (!SCRAPER_TERMINAL.has(s.status)) continue;
        maybeAnnounceScraperFinish({
          runId: runIdForEvents,
          scraperId: s.id,
          scraperName: s.name,
          outcome: s.status as RunFinishOutcome,
          recordsFound: s.lastRun?.recordsFound ?? null,
        });
      }
    }

    const terminal =
      payload.run_status === "succeeded" ||
      payload.run_status === "failed" ||
      payload.run_status === "stopped";

    if (terminal) {
      // Run has ended — keep the final state visible, but stop streaming.
      const finishedRunId = runIdAtConnect;
      const finishedStatus = payload.run_status as RunFinishOutcome;
      setCurrentRunId(null);
      closeStateStream();
      emitRunChanged();
      announceRunFinish(finishedRunId, finishedStatus);
    }
  };
  stateEs.onerror = () => {
    // EventSource auto-reconnect happens at the browser level on transient errors.
    // Avoid our own reconnect when the run id has already been cleared.
    if (!currentRunId || currentRunId !== runIdAtConnect) {
      closeStateStream();
      return;
    }
    closeStateStream();
    reconnectTimer = setTimeout(() => {
      if (currentRunId === runIdAtConnect) connectStateStream();
    }, 3000);
  };
}

function toScraper(raw: ScraperWire): Scraper {
  return {
    id: raw.id,
    name: raw.name,
    domain: raw.domain,
    scriptFile: raw.scriptFile,
    outputCsv: raw.outputCsv,
    cleanedCsv: raw.cleanedCsv,
    keywords: raw.keywords ?? [],
    countries: raw.countries ?? [],
    status: raw.status,
    progress: raw.progress ?? 0,
    lastRun: raw.lastRun ?? undefined,
    recentRuns: raw.recentRuns ?? [],
  };
}

export const httpScraperClient: ScraperClient = {
  async list() {
    const rows = await request<ScraperWire[]>("/api/scrapers");
    currentScrapers = rows.map(toScraper);
    notifyScrapers();
    return currentScrapers;
  },

  async get(id) {
    if (!currentScrapers.length) {
      await this.list();
    }
    return currentScrapers.find((s) => s.id === id);
  },

  async start(ids, options?: RunOptions) {
    const out = await request<{ run_id: string }>("/api/runs", {
      method: "POST",
      body: JSON.stringify({
        scraper_ids: ids,
        keywords: options?.keywords?.length ? options.keywords : undefined,
        countries: options?.countries?.length ? options.countries : undefined,
        target_suppliers: options?.targetSuppliers,
      }),
    });
    setCurrentRunId(out.run_id);
    // Allow the new run to fire its finish event even if it shares an id with state.
    announcedRunFinishes.delete(out.run_id);
    connectStateStream();
    emitRunChanged();
    await this.list();
  },

  async stop(ids) {
    if (!currentRunId) return;
    await request(`/api/runs/${currentRunId}/stop`, {
      method: "POST",
      body: JSON.stringify({ scraper_ids: ids }),
    });
  },

  subscribeLogs(scraperId, cb) {
    const logs: LogEntry[] = [];
    let es: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed || !currentRunId) return;
      es?.close();
      es = new EventSource(
        `${API_BASE}/api/runs/${currentRunId}/scrapers/${scraperId}/logs`
      );
      es.onmessage = (evt) => {
        const item = JSON.parse(evt.data) as LogEntry;
        logs.push(item);
        if (logs.length > 1000) logs.shift();
        cb([...logs]);
      };
      es.onerror = () => {
        es?.close();
      };
    };

    const onRunChanged = () => {
      logs.length = 0;
      cb([]);
      connect();
    };

    runListeners.add(onRunChanged);
    if (!currentRunId) cb([]);
    connect();

    return () => {
      closed = true;
      runListeners.delete(onRunChanged);
      es?.close();
    };
  },

  subscribeScrapers(cb) {
    scraperSubscribers.add(cb);
    cb([...currentScrapers]);
    void this.list();
    if (!currentRunId && typeof window !== "undefined") {
      setCurrentRunId(window.localStorage.getItem(ACTIVE_RUN_KEY));
    }
    connectStateStream();
    emitRunChanged();
    return () => {
      scraperSubscribers.delete(cb);
      if (scraperSubscribers.size === 0) {
        closeStateStream();
      }
    };
  },

  onRunFinished(cb) {
    finishListeners.add(cb);
    return () => {
      finishListeners.delete(cb);
    };
  },

  onScraperFinished(cb) {
    scraperFinishListeners.add(cb);
    return () => {
      scraperFinishListeners.delete(cb);
    };
  },

  combinedCsvUrl(runId) {
    return `${API_BASE}/api/runs/${runId}/combined.csv`;
  },

  scraperCleanedCsvUrl(runId, scraperId) {
    return `${API_BASE}/api/runs/${runId}/scrapers/${scraperId}/cleaned.csv`;
  },

  scraperRawCsvUrl(runId, scraperId) {
    return `${API_BASE}/api/runs/${runId}/scrapers/${scraperId}/raw.csv`;
  },

  scraperPartialCsvUrl(runId, scraperId) {
    return `${API_BASE}/api/runs/${runId}/scrapers/${scraperId}/partial.csv`;
  },

  getLastFinishedRun() {
    return lastFinishedRun;
  },
};

