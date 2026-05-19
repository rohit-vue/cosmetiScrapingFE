import type { RunOptions, ScraperClient, Unsubscribe } from "./client";
import type {
  LogEntry,
  LogLevel,
  RunSummary,
  Scraper,
  ScraperStatus,
} from "./types";

const MAX_LOGS = 1000;

const SAMPLE_KEYWORDS = [
  "cosmetic tubes",
  "cosmetic bottles",
  "cosmetic jars",
  "cosmetic packaging",
  "airless pumps",
  "glass dropper bottles",
];

const SAMPLE_COUNTRIES = [
  "China",
  "South Korea",
  "Taiwan",
  "Japan",
  "Vietnam",
  "Thailand",
];

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function cloneOne(s: Scraper): Scraper {
  return {
    ...s,
    keywords: [...s.keywords],
    countries: [...s.countries],
    recentRuns: s.recentRuns.map((r) => ({ ...r })),
    lastRun: s.lastRun ? { ...s.lastRun } : undefined,
  };
}

function cloneScrapers(map: Map<string, Scraper>): Scraper[] {
  return Array.from(map.values()).map(cloneOne);
}

function initialRegistry(): Map<string, Scraper> {
  const defs: Omit<Scraper, "status" | "progress" | "lastRun" | "recentRuns">[] =
    [
      {
        id: "tradewheel",
        name: "Tradewheel",
        domain: "tradewheel.com",
        scriptFile: "tradewheel_scraper.py",
        keywords: SAMPLE_KEYWORDS,
        countries: SAMPLE_COUNTRIES,
        outputCsv: "tradewheel_suppliers_raw.csv",
      },
      {
        id: "kompass",
        name: "Kompass",
        domain: "kompass.com",
        scriptFile: "kompass_enhanced.py",
        keywords: SAMPLE_KEYWORDS.slice(0, 4),
        countries: SAMPLE_COUNTRIES.slice(0, 5),
        outputCsv: "kompass_suppliers_phase1_raw.csv",
      },
      {
        id: "made_in_china",
        name: "Made-in-China",
        domain: "made-in-china.com",
        scriptFile: "made_in_china_scraper_final.py",
        keywords: SAMPLE_KEYWORDS,
        countries: ["China"],
        outputCsv: "made_in_china_suppliers_phase1_raw.csv",
      },
      {
        id: "ec21",
        name: "EC21",
        domain: "ec21.com",
        scriptFile: "ec21_scraper_final.py",
        keywords: [
          "cosmetic-packaging",
          "cosmetic-bottles",
          "cosmetic-tubes",
        ],
        countries: SAMPLE_COUNTRIES,
        outputCsv: "ec21_suppliers_phase1_raw.csv",
      },
      {
        id: "exportpages",
        name: "ExportPages",
        domain: "exportpages.com",
        scriptFile: "exportpages_scraper_final.py",
        keywords: ["category 142", "cosmetic packaging"],
        countries: SAMPLE_COUNTRIES,
        outputCsv: "exportpages_suppliers_raw.csv",
      },
      {
        id: "ensun",
        name: "Ensun",
        domain: "ensun.io",
        scriptFile: "ensun_script.py",
        keywords: [
          "cosmetic packaging",
          "cosmetic bottles",
          "cosmetic tubes",
        ],
        countries: SAMPLE_COUNTRIES,
        outputCsv: "ensun_suppliers_phase1_raw.csv",
      },
      {
        id: "europages",
        name: "Europages",
        domain: "europages.co.uk",
        scriptFile: "eurpages_scraper.py",
        keywords: [
          "cosmetic packaging",
          "cosmetic bottles",
          "cosmetic tubes",
        ],
        countries: SAMPLE_COUNTRIES,
        outputCsv: "europages_suppliers_phase1_raw.csv",
      },
    ];

  const m = new Map<string, Scraper>();
  for (const d of defs) {
    m.set(d.id, {
      ...d,
      status: "idle",
      progress: 0,
      recentRuns: [],
    });
  }
  return m;
}

type SimHandle = {
  intervalId: ReturnType<typeof setInterval>;
  tick: number;
  runId: string;
  startedAt: string;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomLogLine(
  scraper: Scraper,
  tick: number
): { level: LogLevel; message: string } {
  const kw = pick(scraper.keywords);
  const page = Math.min(35, 1 + Math.floor(tick / 3));
  const templates: { weight: number; gen: () => { level: LogLevel; message: string } }[] =
    [
      {
        weight: 40,
        gen: () => ({
          level: "info",
          message: `Searching "${kw}" on ${scraper.domain} — page ${page}`,
        }),
      },
      {
        weight: 15,
        gen: () => ({
          level: "success",
          message: `Found ${5 + (tick % 12)} new supplier rows (deduped by company)`,
        }),
      },
      {
        weight: 10,
        gen: () => ({
          level: "info",
          message: `Delay ${(2 + Math.random() * 4).toFixed(1)}s before next request`,
        }),
      },
      {
        weight: 8,
        gen: () => ({
          level: "warn",
          message: `Slow response from ${scraper.domain}; retrying with backoff`,
        }),
      },
      {
        weight: 4,
        gen: () => ({
          level: "warn",
          message: `Selector mismatch on listing — falling back to alternate XPath`,
        }),
      },
      {
        weight: 3,
        gen: () => ({
          level: "error",
          message: `Timeout waiting for network idle (continuing)`,
        }),
      },
      {
        weight: 8,
        gen: () => ({
          level: "info",
          message: `Checkpoint: writing partial rows to ${scraper.outputCsv}`,
        }),
      },
      {
        weight: 6,
        gen: () => ({
          level: "info",
          message: `Enrichment: fetching contact page for supplier #${100 + tick * 7}`,
        }),
      },
    ];

  let r = Math.random() * 100;
  for (const t of templates) {
    r -= t.weight;
    if (r <= 0) return t.gen();
  }
  return templates[0]!.gen();
}

class MockScraperClientImpl implements ScraperClient {
  private scrapers = initialRegistry();
  private logs = new Map<string, LogEntry[]>();
  private sims = new Map<string, SimHandle>();
  /** Incremented on stop to invalidate pending start timeouts. */
  private startGen = new Map<string, number>();
  private scraperListeners = new Set<(s: Scraper[]) => void>();
  private logListeners = new Map<string, Set<(e: LogEntry[]) => void>>();

  constructor() {
    for (const id of this.scrapers.keys()) {
      this.logs.set(id, []);
    }
  }

  private emitScrapers() {
    const snap = cloneScrapers(this.scrapers);
    for (const cb of this.scraperListeners) cb(snap);
  }

  private emitLogs(scraperId: string) {
    const list = this.logs.get(scraperId) ?? [];
    const cbs = this.logListeners.get(scraperId);
    if (!cbs) return;
    for (const cb of cbs) cb([...list]);
  }

  private pushLog(scraperId: string, level: LogLevel, message: string) {
    const arr = this.logs.get(scraperId) ?? [];
    const entry: LogEntry = {
      id: uid(),
      ts: new Date().toISOString(),
      level,
      message,
    };
    arr.push(entry);
    while (arr.length > MAX_LOGS) arr.shift();
    this.logs.set(scraperId, arr);
    this.emitLogs(scraperId);
  }

  private setStatus(id: string, status: ScraperStatus, progress?: number) {
    const s = this.scrapers.get(id);
    if (!s) return;
    s.status = status;
    if (progress !== undefined) s.progress = progress;
    this.emitScrapers();
  }

  private finishRun(
    id: string,
    outcome: "succeeded" | "failed" | "stopped",
    errorMessage?: string
  ) {
    const s = this.scrapers.get(id);
    const handle = this.sims.get(id);
    if (!s || !handle) return;

    clearInterval(handle.intervalId);
    this.sims.delete(id);

    const endedAt = new Date().toISOString();
    const durationMs =
      new Date(endedAt).getTime() - new Date(handle.startedAt).getTime();

    const recordsFound =
      outcome === "succeeded"
        ? 40 + Math.floor(Math.random() * 200)
        : outcome === "failed"
          ? Math.floor(Math.random() * 30)
          : Math.floor(Math.random() * 80);

    const run: RunSummary = {
      id: handle.runId,
      startedAt: handle.startedAt,
      endedAt,
      durationMs,
      recordsFound,
      errorMessage,
      outcome,
    };

    s.recentRuns = [run, ...s.recentRuns].slice(0, 8);
    s.lastRun = run;
    s.progress = outcome === "succeeded" ? 100 : s.progress;
    s.status =
      outcome === "succeeded"
        ? "succeeded"
        : outcome === "failed"
          ? "failed"
          : "stopped";

    this.emitScrapers();

    if (outcome === "succeeded") {
      this.pushLog(id, "success", `Run complete — ${recordsFound} records written to ${s.outputCsv}`);
    } else if (outcome === "failed") {
      this.pushLog(id, "error", errorMessage ?? "Run failed");
    } else {
      this.pushLog(id, "warn", "Run stopped by user");
    }
  }

  private startSimulation(id: string) {
    if (this.sims.has(id)) return;

    const s = this.scrapers.get(id);
    if (!s) return;

    const runId = uid();
    const startedAt = new Date().toISOString();

    this.pushLog(id, "info", `Starting scraper (${s.scriptFile})`);
    this.pushLog(id, "info", `Target: ${s.domain} — output ${s.outputCsv}`);

    const handle: SimHandle = {
      runId,
      startedAt,
      tick: 0,
      intervalId: setInterval(() => {
        const sc = this.scrapers.get(id);
        if (!sc || sc.status !== "running") return;

        handle.tick += 1;
        const line = randomLogLine(sc, handle.tick);
        this.pushLog(id, line.level, line.message);

        const nextProgress = Math.min(
          99,
          Math.floor((handle.tick / 28) * 100) + Math.floor(Math.random() * 4)
        );
        sc.progress = nextProgress;
        this.emitScrapers();

        if (handle.tick >= 26 + Math.floor(Math.random() * 8)) {
          const failRoll = Math.random();
          if (failRoll < 0.07) {
            this.finishRun(id, "failed", "Playwright browser closed unexpectedly");
          } else {
            this.finishRun(id, "succeeded");
          }
        }
      }, 450 + Math.floor(Math.random() * 350)),
    };

    this.sims.set(id, handle);
  }

  async list(): Promise<Scraper[]> {
    return cloneScrapers(this.scrapers);
  }

  async get(id: string): Promise<Scraper | undefined> {
    const s = this.scrapers.get(id);
    return s ? cloneOne(s) : undefined;
  }

  async start(ids: string[], options?: RunOptions): Promise<void> {
    const unique = [...new Set(ids)].filter(Boolean);
    let delay = 0;
    for (const id of unique) {
      const s = this.scrapers.get(id);
      if (!s) continue;
      if (s.status === "running" || s.status === "queued") continue;
      if (options?.keywords?.length) s.keywords = [...options.keywords];
      if (options?.countries?.length) s.countries = [...options.countries];

      const gateOuter = this.startGen.get(id) ?? 0;
      globalThis.setTimeout(() => {
        if ((this.startGen.get(id) ?? 0) !== gateOuter) return;
        const cur = this.scrapers.get(id);
        if (!cur || cur.status === "running") return;
        cur.status = "queued";
        cur.progress = 0;
        this.emitScrapers();
        this.pushLog(id, "info", "Queued…");
        if (options?.targetSuppliers) {
          this.pushLog(id, "info", `Manual target suppliers: ${options.targetSuppliers}`);
        }

        const gateInner = this.startGen.get(id) ?? 0;
        globalThis.setTimeout(() => {
          if ((this.startGen.get(id) ?? 0) !== gateInner) return;
          const c2 = this.scrapers.get(id);
          if (!c2 || c2.status !== "queued") return;
          c2.status = "running";
          c2.progress = 2;
          this.emitScrapers();
          this.startSimulation(id);
        }, 320 + Math.floor(Math.random() * 400));
      }, delay);
      delay += 180;
    }
  }

  async stop(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.startGen.set(id, (this.startGen.get(id) ?? 0) + 1);

      const handle = this.sims.get(id);
      const s = this.scrapers.get(id);
      if (handle && s && s.status === "running") {
        this.finishRun(id, "stopped");
      } else if (s?.status === "queued") {
        s.status = "stopped";
        s.progress = 0;
        this.emitScrapers();
        this.pushLog(id, "warn", "Stopped while queued");
      }
    }
  }

  subscribeLogs(scraperId: string, cb: (entries: LogEntry[]) => void): Unsubscribe {
    let set = this.logListeners.get(scraperId);
    if (!set) {
      set = new Set();
      this.logListeners.set(scraperId, set);
    }
    set.add(cb);
    cb([...(this.logs.get(scraperId) ?? [])]);
    return () => {
      set!.delete(cb);
    };
  }

  subscribeScrapers(cb: (scrapers: Scraper[]) => void): Unsubscribe {
    this.scraperListeners.add(cb);
    cb(cloneScrapers(this.scrapers));
    return () => {
      this.scraperListeners.delete(cb);
    };
  }
}

export const mockScraperClient: ScraperClient = new MockScraperClientImpl();
