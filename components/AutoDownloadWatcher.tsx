"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { ScraperFinishEvent } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";

type ToastFn = (msg: string, level?: "success" | "error" | "info") => void;

type Variant = "cleaned" | "raw" | "partial";

const DOWNLOAD_GAP_MS = 600;

export function AutoDownloadWatcher() {
  const { show } = useToast();
  // Queue holds scraper-finish events. We expand each event into multiple
  // download attempts (cleaned + raw + partial) inside the drain loop so we
  // can space them out and avoid the browser blocking "multiple downloads".
  const queueRef = useRef<ScraperFinishEvent[]>([]);
  const draining = useRef(false);

  useEffect(() => {
    if (!api.onScraperFinished) return;

    const drain = async () => {
      if (draining.current) return;
      draining.current = true;
      try {
        while (queueRef.current.length > 0) {
          const next = queueRef.current.shift();
          if (!next) break;
          await processFinishEvent(next, show);
        }
      } finally {
        draining.current = false;
      }
    };

    return api.onScraperFinished((event) => {
      queueRef.current.push(event);
      void drain();
    });
  }, [show]);

  return null;
}

async function processFinishEvent(event: ScraperFinishEvent, show: ToastFn) {
  const cleanedUrl = api.scraperCleanedCsvUrl?.(event.runId, event.scraperId);
  const rawUrl = api.scraperRawCsvUrl?.(event.runId, event.scraperId);
  const partialUrl = api.scraperPartialCsvUrl?.(event.runId, event.scraperId);

  const rowsLabel =
    event.recordsFound != null
      ? `${event.recordsFound} row${event.recordsFound === 1 ? "" : "s"}`
      : "data";
  const outcomeLabel =
    event.outcome === "succeeded"
      ? "completed"
      : event.outcome === "failed"
        ? "failed"
        : "stopped";
  const level: "success" | "error" | "info" =
    event.outcome === "succeeded"
      ? "success"
      : event.outcome === "failed"
        ? "error"
        : "info";

  const downloaded: Variant[] = [];
  if (cleanedUrl && (await fileAvailable(cleanedUrl))) {
    triggerSave(cleanedUrl, `${event.scraperId}_cleaned_${event.runId.slice(0, 8)}.csv`);
    downloaded.push("cleaned");
    await sleep(DOWNLOAD_GAP_MS);
  }

  // Probe each optional artifact first so a stopped/failed run with no CSV
  // does not navigate the browser to the backend's JSON 404 response.
  if (rawUrl && (await fileAvailable(rawUrl))) {
    triggerSave(rawUrl, `${event.scraperId}_raw_${event.runId.slice(0, 8)}.csv`);
    downloaded.push("raw");
    await sleep(DOWNLOAD_GAP_MS);
  }
  if (partialUrl && (await fileAvailable(partialUrl))) {
    triggerSave(
      partialUrl,
      `${event.scraperId}_partial_${event.runId.slice(0, 8)}.csv`
    );
    downloaded.push("partial");
    await sleep(DOWNLOAD_GAP_MS);
  }

  const filesLabel =
    downloaded.length === 0
      ? "no CSV files were available"
      : `saved ${downloaded.join(" + ")} CSV${downloaded.length === 1 ? "" : "s"}`;

  show(
    `${event.scraperName} ${outcomeLabel} (${rowsLabel}) — ${filesLabel}`,
    level
  );
}

async function fileAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function triggerSave(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
