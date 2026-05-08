"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Scraper } from "@/lib/api/types";

export function TopBar({
  scrapers,
  className,
}: {
  scrapers: Scraper[];
  className?: string;
}) {
  const running = scrapers.filter((s) => s.status === "running");
  const names = running.map((s) => s.name).join(", ");

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-white/[0.06] bg-zinc-950/80 px-4 backdrop-blur-md md:h-16 md:px-6",
        className
      )}
    >
      <div className="min-w-0 pl-10 md:pl-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-50">
          Supplier scrapers
        </h1>
        <p className="truncate text-xs text-zinc-500">
          Monitor runs, logs, and progress across B2B sources
        </p>
      </div>
      <div
        className={cn(
          "flex max-w-[min(420px,55vw)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
          running.length > 0
            ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
            : "border-white/[0.06] bg-zinc-900/60 text-zinc-500"
        )}
      >
        <Activity
          className={cn(
            "size-3.5 shrink-0",
            running.length > 0 && "animate-pulse text-emerald-400"
          )}
        />
        <span className="truncate">
          {running.length > 0
            ? `Scraping: ${names || "…"}`
            : "No active scrapers"}
        </span>
      </div>
    </header>
  );
}
