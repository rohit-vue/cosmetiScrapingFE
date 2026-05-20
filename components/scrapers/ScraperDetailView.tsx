"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Play,
  Square,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Scraper } from "@/lib/api/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatDurationMs } from "@/lib/utils/format";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { LiveLogConsole } from "./LiveLogConsole";

export function ScraperDetailView({ scraperId }: { scraperId: string }) {
  const router = useRouter();
  const [scraper, setScraper] = useState<Scraper | null>(null);
  const [missing, setMissing] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    let mounted = true;
    void api.get(scraperId).then((s) => {
      if (!mounted) return;
      if (!s) {
        setMissing(true);
        setScraper(null);
        return;
      }
      setScraper(s);
      setMissing(false);
    });
    const unsub = api.subscribeScrapers((list) => {
      if (!mounted) return;
      const s = list.find((x) => x.id === scraperId);
      if (s) setScraper(s);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [scraperId]);

  const latestSuccessfulRun = useMemo(() => {
    if (!scraper) return undefined;
    return (
      scraper.recentRuns.find((r) => r.outcome === "succeeded") ??
      (scraper.lastRun?.outcome === "succeeded" ? scraper.lastRun : undefined)
    );
  }, [scraper]);

  // Latest run that has reached a terminal state (succeeded / failed / stopped).
  // Used for cleaned + raw + partial downloads — those exist for any terminal
  // outcome (cleaned is always written, raw/partial may exist depending on
  // how far the scraper got).
  const latestTerminalRun = useMemo(() => {
    if (!scraper) return undefined;
    const isTerminal = (o?: string) =>
      o === "succeeded" || o === "failed" || o === "stopped";
    if (scraper.lastRun && isTerminal(scraper.lastRun.outcome)) {
      return scraper.lastRun;
    }
    return scraper.recentRuns.find((r) => isTerminal(r.outcome));
  }, [scraper]);

  if (missing) {
    return (
      <EmptyState
        title="Scraper not found"
        description="Check the URL or return to the dashboard."
        action={
          <Button variant="secondary" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        }
      />
    );
  }

  if (!scraper) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-zinc-500">
        <Spinner size="lg" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const canStart =
    scraper.status === "idle" ||
    scraper.status === "succeeded" ||
    scraper.status === "failed" ||
    scraper.status === "stopped";
  const canStop =
    scraper.status === "running" || scraper.status === "queued";
  const manualKeywords = scraper.manualKeywords ?? [];
  const manualCountries = scraper.manualCountries ?? [];

  const cleanedCsvUrl =
    latestTerminalRun &&
    latestTerminalRun.outcome === "succeeded" &&
    api.scraperCleanedCsvUrl
      ? api.scraperCleanedCsvUrl(latestTerminalRun.id, scraper.id)
      : null;
  const rawCsvUrl =
    latestTerminalRun && api.scraperRawCsvUrl
      ? api.scraperRawCsvUrl(latestTerminalRun.id, scraper.id)
      : null;
  const partialCsvUrl =
    latestTerminalRun && api.scraperPartialCsvUrl
      ? api.scraperPartialCsvUrl(latestTerminalRun.id, scraper.id)
      : null;
  const combinedCsvUrl =
    latestSuccessfulRun && api.combinedCsvUrl
      ? api.combinedCsvUrl(latestSuccessfulRun.id)
      : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Dashboard
        </Link>
        <ChevronRight className="size-4 shrink-0 opacity-60" />
        <span className="text-zinc-200">{scraper.name}</span>
      </nav>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
                {scraper.name}
              </h1>
              <StatusBadge status={scraper.status} />
            </div>
            <a
              href={`https://${scraper.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-emerald-400/90 hover:text-emerald-300"
            >
              {scraper.domain}
              <ExternalLink className="size-3.5" />
            </a>
            <ProgressBar
              status={scraper.status}
              progress={scraper.progress}
              className="max-w-md"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="primary"
              disabled={!canStart}
              onClick={async () => {
                await api.start([scraper.id]);
                show("Run started", "success");
              }}
            >
              <Play className="size-4" />
              Start
            </Button>
            <Button
              variant="danger"
              disabled={!canStop}
              onClick={async () => {
                await api.stop([scraper.id]);
                show("Stop requested", "info");
              }}
            >
              <Square className="size-4" />
              Stop
            </Button>
          </div>
        </CardHeader>
        <CardContent className="border-t border-white/[0.06] pt-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <LiveLogConsole scraperId={scraper.id} />

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Script
                </h3>
                <p className="mt-1 font-mono text-sm text-zinc-300">{scraper.scriptFile}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Output CSV
                </h3>
                <p className="mt-1 font-mono text-sm text-zinc-300">{scraper.outputCsv}</p>
                {scraper.cleanedCsv ? (
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    cleaned · {scraper.cleanedCsv}
                  </p>
                ) : null}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Downloads
                </h3>
                {latestTerminalRun ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {cleanedCsvUrl ? (
                      <a
                        href={cleanedCsvUrl}
                        download={`${scraper.id}_cleaned_${latestTerminalRun.id.slice(
                          0,
                          8
                        )}.csv`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-900/50"
                        title="Rows with email + company (deduped)"
                      >
                        <Download className="size-3.5" />
                        Cleaned CSV
                      </a>
                    ) : null}
                    {rawCsvUrl ? (
                      <a
                        href={rawCsvUrl}
                        download={`${scraper.id}_raw_${latestTerminalRun.id.slice(
                          0,
                          8
                        )}.csv`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                        title="Final raw output written when the run completes"
                      >
                        <Download className="size-3.5" />
                        Raw CSV
                      </a>
                    ) : null}
                    {partialCsvUrl ? (
                      <a
                        href={partialCsvUrl}
                        download={`${scraper.id}_partial_${latestTerminalRun.id.slice(
                          0,
                          8
                        )}.csv`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                        title="Autosaved partial CSV (every 25 records). Useful if the run was stopped or crashed."
                      >
                        <Download className="size-3.5" />
                        Partial CSV (autosave)
                      </a>
                    ) : null}
                    {combinedCsvUrl ? (
                      <a
                        href={combinedCsvUrl}
                        download={`combined_suppliers_${latestSuccessfulRun?.id.slice(
                          0,
                          8
                        )}.csv`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                        title="Combined cleaned CSV across all scrapers in the run"
                      >
                        <Download className="size-3.5" />
                        Combined CSV (entire run)
                      </a>
                    ) : null}
                    <p className="text-[11px] text-zinc-600">
                      From last run · {latestTerminalRun.id.slice(0, 8)} ·{" "}
                      <span className="text-zinc-500">{latestTerminalRun.outcome}</span>
                    </p>
                    {!combinedCsvUrl ? (
                      <p className="text-[11px] text-zinc-600">
                        Combined CSV is only generated after a fully successful run.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-600">
                    No completed run yet. Start the scraper to generate CSV outputs.
                  </p>
                )}
              </div>
              {manualKeywords.length ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Keywords
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {manualKeywords.slice(0, 12).map((k) => (
                      <Tag key={k} variant="accent">
                        {k}
                      </Tag>
                    ))}
                    {manualKeywords.length > 12 ? (
                      <Tag variant="muted">+{manualKeywords.length - 12} more</Tag>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {manualCountries.length ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Countries
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {manualCountries.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Recent runs
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-zinc-400">
                  {scraper.recentRuns.length === 0 ? (
                    <li className="text-zinc-600">No runs yet</li>
                  ) : (
                    scraper.recentRuns.map((r) => {
                      const isTerminal =
                        r.outcome === "succeeded" ||
                        r.outcome === "failed" ||
                        r.outcome === "stopped";
                      const cleanedUrl =
                        r.outcome === "succeeded" && api.scraperCleanedCsvUrl
                          ? api.scraperCleanedCsvUrl(r.id, scraper.id)
                          : null;
                      const rawUrl =
                        isTerminal && api.scraperRawCsvUrl
                          ? api.scraperRawCsvUrl(r.id, scraper.id)
                          : null;
                      const partialUrl =
                        isTerminal && api.scraperPartialCsvUrl
                          ? api.scraperPartialCsvUrl(r.id, scraper.id)
                          : null;
                      const pillClass =
                        "inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-zinc-900/70 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800";
                      return (
                        <li
                          key={r.id}
                          className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/40 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-medium text-zinc-300">{r.outcome}</span>
                              {r.recordsFound != null ? (
                                <span className="text-zinc-500">
                                  {" "}
                                  · {r.recordsFound} rows
                                </span>
                              ) : null}
                              {r.durationMs != null ? (
                                <span className="text-zinc-600">
                                  {" "}
                                  · {formatDurationMs(r.durationMs)}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-zinc-600">
                              {r.id.slice(0, 8)}
                            </span>
                          </div>
                          {isTerminal ? (
                            <div className="flex flex-wrap gap-1.5">
                              {cleanedUrl ? (
                                <a
                                  href={cleanedUrl}
                                  download={`${scraper.id}_cleaned_${r.id.slice(0, 8)}.csv`}
                                  className={pillClass}
                                  title="Cleaned CSV (rows with email + company)"
                                >
                                  <Download className="size-3" />
                                  Cleaned
                                </a>
                              ) : null}
                              {rawUrl ? (
                                <a
                                  href={rawUrl}
                                  download={`${scraper.id}_raw_${r.id.slice(0, 8)}.csv`}
                                  className={pillClass}
                                  title="Raw CSV (final unfiltered output)"
                                >
                                  <Download className="size-3" />
                                  Raw
                                </a>
                              ) : null}
                              {partialUrl ? (
                                <a
                                  href={partialUrl}
                                  download={`${scraper.id}_partial_${r.id.slice(0, 8)}.csv`}
                                  className={pillClass}
                                  title="Partial autosaved CSV"
                                >
                                  <Download className="size-3" />
                                  Partial
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
