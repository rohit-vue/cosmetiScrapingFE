"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useScrapers } from "@/lib/hooks/useScrapers";
import { useRunControls } from "@/lib/hooks/useRunControls";
import { useToast } from "@/components/ui/Toast";
import { StatsTiles } from "@/components/scrapers/StatsTiles";
import { ScraperGrid } from "@/components/scrapers/ScraperGrid";
import { RunControls } from "@/components/scrapers/RunControls";
import { LiveLogPreview } from "@/components/scrapers/LiveLogPreview";
import { LastRunBanner } from "@/components/dashboard/LastRunBanner";
import { Activity, Globe2, ListFilter, Target } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api";
import type { RunFinishEvent, RunOptions } from "@/lib/api/client";

function parseManualList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function DashboardView() {
  const { scrapers } = useScrapers();
  const controls = useRunControls();
  const { show } = useToast();
  const running = scrapers.filter((s) => s.status === "running");
  const queued = scrapers.filter((s) => s.status === "queued");
  const [previewScraperId, setPreviewScraperId] = useState<string | null>(null);
  const [finishEvent, setFinishEvent] = useState<RunFinishEvent | null>(
    () => api.getLastFinishedRun?.() ?? null
  );
  const [keywordText, setKeywordText] = useState("");
  const [countryText, setCountryText] = useState("");
  const [targetSuppliers, setTargetSuppliers] = useState("");
  const [bannerDismissedFor, setBannerDismissedFor] = useState<string | null>(null);
  const autoDownloadedRunsRef = useRef<Set<string>>(new Set());

  const activeForLogs = useMemo(
    () => [...running, ...queued],
    [running, queued]
  );
  const selectableScrapers = useMemo(
    () =>
      scrapers.filter(
        (s) => s.status !== "running" && s.status !== "queued"
      ),
    [scrapers]
  );
  const effectivePreviewScraperId =
    previewScraperId && activeForLogs.some((s) => s.id === previewScraperId)
      ? previewScraperId
      : activeForLogs[0]?.id ?? null;
  const manualRunOptions = useMemo<RunOptions>(() => {
    const keywords = parseManualList(keywordText);
    const countries = parseManualList(countryText);
    const target = Number.parseInt(targetSuppliers, 10);
    return {
      ...(keywords.length ? { keywords } : {}),
      ...(countries.length ? { countries } : {}),
      ...(Number.isFinite(target) && target > 0 ? { targetSuppliers: target } : {}),
    };
  }, [countryText, keywordText, targetSuppliers]);

  useEffect(() => {
    if (!api.onRunFinished) return;
    return api.onRunFinished((event) => {
      setFinishEvent(event);
      setBannerDismissedFor(null);
      if (event.status === "succeeded") {
        show("Scraping run complete — downloading CSV", "success");
        const url = api.combinedCsvUrl?.(event.runId);
        if (url && !autoDownloadedRunsRef.current.has(event.runId)) {
          autoDownloadedRunsRef.current.add(event.runId);
          const a = document.createElement("a");
          a.href = url;
          a.download = `combined_suppliers_${event.runId.slice(0, 8)}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else if (event.status === "failed") {
        show("Scraping run failed", "error");
      } else if (event.status === "stopped") {
        show("Scraping run stopped", "info");
      }
    });
  }, [show]);

  const showBanner =
    finishEvent && finishEvent.runId !== bannerDismissedFor;
  const csvUrl =
    finishEvent && finishEvent.status === "succeeded"
      ? api.combinedCsvUrl?.(finishEvent.runId)
      : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-24">
      <div>
        <p className="text-sm text-zinc-500">
          Select sources and run scraping jobs. Live status updates the header bar.
        </p>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
            running.length + queued.length > 0
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
              : "border-white/10 bg-zinc-900/40 text-zinc-500"
          )}
        >
          <Activity
            className={cn(
              "size-3.5",
              running.length + queued.length > 0 && "animate-pulse text-emerald-400"
            )}
          />
          {running.length + queued.length > 0
            ? `${running.length} running, ${queued.length} queued. Open a scraper card for live logs.`
            : "No active run."}
        </div>
      </div>

      {showBanner && finishEvent ? (
        <LastRunBanner
          event={finishEvent}
          csvUrl={csvUrl}
          onDismiss={() => setBannerDismissedFor(finishEvent.runId)}
        />
      ) : null}

      <StatsTiles scrapers={scrapers} />

      <section className="grid gap-3 rounded-lg border border-white/[0.08] bg-zinc-950/50 p-4 lg:grid-cols-[1fr_1fr_180px]">
        <label className="min-w-0">
          <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <ListFilter className="size-3.5" />
            Keywords
          </span>
          <textarea
            value={keywordText}
            onChange={(e) => setKeywordText(e.target.value)}
            rows={3}
            placeholder="cosmetic bottles, airless pumps"
            className="min-h-24 w-full resize-y rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Globe2 className="size-3.5" />
            Countries
          </span>
          <textarea
            value={countryText}
            onChange={(e) => setCountryText(e.target.value)}
            rows={3}
            placeholder="China, South Korea, Vietnam"
            className="min-h-24 w-full resize-y rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Target className="size-3.5" />
            Target
          </span>
          <input
            value={targetSuppliers}
            onChange={(e) => setTargetSuppliers(e.target.value)}
            type="number"
            min={1}
            step={1}
            placeholder="500"
            className="h-10 w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
        </label>
      </section>

      {activeForLogs.length > 0 && effectivePreviewScraperId ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {activeForLogs.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPreviewScraperId(s.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  effectivePreviewScraperId === s.id
                    ? "border-emerald-500/40 bg-emerald-950/45 text-emerald-200"
                    : "border-white/10 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <LiveLogPreview
            scraperId={effectivePreviewScraperId}
            scraperName={
              activeForLogs.find((s) => s.id === effectivePreviewScraperId)?.name ??
              effectivePreviewScraperId
            }
          />
        </div>
      ) : null}

      <ScraperGrid
        scrapers={scrapers}
        selectedIds={controls.selectedIds}
        onSelectChange={(id, next) => {
          const has = controls.selected.has(id);
          if (next !== has) controls.toggle(id);
        }}
        onStart={async (id) => {
          await controls.startOne(id, manualRunOptions);
          show(`Started ${id}`, "success");
        }}
        onStop={async (id) => {
          await controls.stopOne(id);
          show(`Stop requested for ${id}`, "info");
        }}
      />

      <RunControls
        selectedCount={controls.selectedIds.length}
        selectableCount={selectableScrapers.length}
        onClearSelection={() => controls.clearSelection()}
        onRunSelected={async () => {
          await controls.runSelected(manualRunOptions);
          show(`Queued ${controls.selectedIds.length} scraper(s)`, "success");
        }}
        onStopAll={async () => {
          await controls.stopAll();
          show("Stopped active scrapers", "info");
        }}
      />
    </div>
  );
}
