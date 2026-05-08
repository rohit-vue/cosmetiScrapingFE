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
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api";
import type { RunFinishEvent } from "@/lib/api/client";

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
          await controls.startOne(id);
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
          await controls.runSelected();
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
