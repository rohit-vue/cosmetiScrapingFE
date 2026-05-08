"use client";

import Link from "next/link";
import { Play, Square } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils/cn";
import { formatDurationMs } from "@/lib/utils/format";
import type { Scraper } from "@/lib/api/types";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";

export function ScraperCard({
  scraper,
  selected,
  onSelectChange,
  onStart,
  onStop,
}: {
  scraper: Scraper;
  selected: boolean;
  onSelectChange: (id: string, next: boolean) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}) {
  const canStart =
    scraper.status === "idle" ||
    scraper.status === "succeeded" ||
    scraper.status === "failed" ||
    scraper.status === "stopped";
  const canStop =
    scraper.status === "running" || scraper.status === "queued";

  const initial = scraper.name.slice(0, 1).toUpperCase();

  return (
    <Card
      className={cn(
        "group flex flex-col transition-shadow duration-300",
        scraper.status === "running" &&
          "ring-1 ring-emerald-500/30 shadow-emerald-900/10"
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onChange={(e) =>
              onSelectChange(scraper.id, (e.target as HTMLInputElement).checked)
            }
            aria-label={`Select ${scraper.name}`}
            className="pt-1"
          />
          <Link
            href={`/scrapers/${scraper.id}`}
            className="min-w-0 flex-1 rounded-lg outline-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold",
                  "border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-200",
                  scraper.status === "running" &&
                    "border-emerald-500/40 text-emerald-200 shadow-inner shadow-emerald-900/20"
                )}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-zinc-100 group-hover:text-emerald-200/90">
                  {scraper.name}
                </h2>
                <p className="truncate text-xs text-zinc-500">{scraper.domain}</p>
              </div>
            </div>
          </Link>
          <StatusBadge status={scraper.status} className="shrink-0" />
        </div>

        <ProgressBar status={scraper.status} progress={scraper.progress} />

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            {scraper.scriptFile}
          </span>
          {scraper.lastRun?.endedAt ? (
            <span>
              Last:{" "}
              {scraper.lastRun.recordsFound != null
                ? `${scraper.lastRun.recordsFound} rows`
                : "—"}
              {scraper.lastRun.durationMs != null
                ? ` · ${formatDurationMs(scraper.lastRun.durationMs)}`
                : null}
            </span>
          ) : (
            <span>No runs yet</span>
          )}
          {(scraper.status === "running" || scraper.status === "queued") && (
            <Link
              href={`/scrapers/${scraper.id}`}
              className="text-emerald-400 hover:text-emerald-300"
            >
              Live logs
            </Link>
          )}
        </div>

        <div className="mt-auto flex gap-2 border-t border-white/[0.06] pt-3">
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            disabled={!canStart}
            onClick={() => onStart(scraper.id)}
          >
            <Play className="size-3.5" />
            Start
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="flex-1"
            disabled={!canStop}
            onClick={() => onStop(scraper.id)}
          >
            <Square className="size-3.5" />
            Stop
          </Button>
        </div>
      </div>
    </Card>
  );
}
