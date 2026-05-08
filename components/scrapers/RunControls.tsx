"use client";

import { Play, Square, XSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function RunControls({
  selectedCount,
  selectableCount,
  onClearSelection,
  onRunSelected,
  onStopAll,
  className,
}: {
  selectedCount: number;
  selectableCount: number;
  onClearSelection: () => void;
  onRunSelected: () => void;
  onStopAll: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/90 p-3 shadow-2xl shadow-black/40 backdrop-blur-md md:bottom-6",
        className
      )}
    >
      <p className="text-sm text-zinc-400">
        <span className="font-medium text-zinc-200">{selectedCount}</span>{" "}
        scraper{selectedCount === 1 ? "" : "s"} selected
        {selectableCount > 0 ? (
          <span className="text-zinc-600"> · {selectableCount} available</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {selectedCount > 0 ? (
          <Button variant="ghost" size="md" onClick={onClearSelection}>
            <XSquare className="size-4" />
            Clear
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="md"
          disabled={selectedCount === 0}
          onClick={onRunSelected}
        >
          <Play className="size-4" />
          Run selected
        </Button>
        <Button variant="secondary" size="md" onClick={onStopAll}>
          <Square className="size-4" />
          Stop all
        </Button>
      </div>
    </div>
  );
}
