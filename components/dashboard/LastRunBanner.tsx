"use client";

import { CheckCircle2, Download, OctagonX, X, XCircle } from "lucide-react";
import type { RunFinishEvent } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

const statusConfig = {
  succeeded: {
    label: "Run completed",
    icon: CheckCircle2,
    accent: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    iconClass: "text-emerald-400",
  },
  failed: {
    label: "Run failed",
    icon: XCircle,
    accent: "border-red-500/30 bg-red-950/40 text-red-200",
    iconClass: "text-red-400",
  },
  stopped: {
    label: "Run stopped",
    icon: OctagonX,
    accent: "border-amber-500/25 bg-amber-950/30 text-amber-200",
    iconClass: "text-amber-300",
  },
} as const;

export function LastRunBanner({
  event,
  csvUrl,
  onDismiss,
}: {
  event: RunFinishEvent;
  csvUrl?: string;
  onDismiss: () => void;
}) {
  const cfg = statusConfig[event.status];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        cfg.accent
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={cn("size-5 shrink-0", cfg.iconClass)} />
        <div className="min-w-0">
          <p className="font-medium">{cfg.label}</p>
          <p className="truncate text-xs opacity-75">
            run id: {event.runId}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {csvUrl ? (
          <a
            href={csvUrl}
            download={`combined_suppliers_${event.runId.slice(0, 8)}.csv`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
          >
            <Download className="size-3.5" />
            Download combined CSV
          </a>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1.5 text-current/80 hover:bg-white/5 hover:text-current"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
