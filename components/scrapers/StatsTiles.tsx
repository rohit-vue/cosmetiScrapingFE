"use client";

import { AlertTriangle, CheckCircle2, Loader2, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { Scraper } from "@/lib/api/types";

function Tile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Layers;
  accent: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg border",
            accent
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

export function StatsTiles({ scrapers }: { scrapers: Scraper[] }) {
  const total = scrapers.length;
  const running = scrapers.filter((s) => s.status === "running").length;
  const succeededToday = scrapers.filter(
    (s) =>
      s.lastRun?.outcome === "succeeded" &&
      s.lastRun.endedAt &&
      new Date(s.lastRun.endedAt).toDateString() === new Date().toDateString()
  ).length;
  const failed = scrapers.filter((s) => s.status === "failed").length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Sources"
        value={total}
        icon={Layers}
        accent="border-white/10 bg-zinc-800/50 text-zinc-300"
      />
      <Tile
        label="Running"
        value={running}
        icon={Loader2}
        accent={cn(
          "border-emerald-500/25 bg-emerald-950/40 text-emerald-400",
          running > 0 && "[&_svg]:animate-spin"
        )}
      />
      <Tile
        label="Succeeded today"
        value={succeededToday}
        icon={CheckCircle2}
        accent="border-emerald-500/20 bg-emerald-950/30 text-emerald-300"
      />
      <Tile
        label="Failed (current)"
        value={failed}
        icon={AlertTriangle}
        accent="border-amber-500/20 bg-amber-950/30 text-amber-300"
      />
    </div>
  );
}
