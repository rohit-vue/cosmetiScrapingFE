"use client";

import type { Scraper } from "@/lib/api/types";
import { ScraperCard } from "./ScraperCard";

export function ScraperGrid({
  scrapers,
  selectedIds,
  onSelectChange,
  onStart,
  onStop,
}: {
  scrapers: Scraper[];
  selectedIds: string[];
  onSelectChange: (id: string, next: boolean) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}) {
  const sel = new Set(selectedIds);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {scrapers.map((s) => (
        <ScraperCard
          key={s.id}
          scraper={s}
          selected={sel.has(s.id)}
          onSelectChange={onSelectChange}
          onStart={onStart}
          onStop={onStop}
        />
      ))}
    </div>
  );
}
