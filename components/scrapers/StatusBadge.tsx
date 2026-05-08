import {
  CheckCircle2,
  CircleDot,
  Loader2,
  OctagonX,
  Timer,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ScraperStatus } from "@/lib/api/types";

const config: Record<
  ScraperStatus,
  { label: string; className: string; icon: typeof Loader2 }
> = {
  idle: {
    label: "Idle",
    className: "bg-zinc-800/80 text-zinc-400 border-white/10",
    icon: CircleDot,
  },
  queued: {
    label: "Queued",
    className: "bg-amber-950/60 text-amber-300 border-amber-500/25",
    icon: Timer,
  },
  running: {
    label: "Running",
    className: "bg-emerald-950/60 text-emerald-300 border-emerald-500/30",
    icon: Loader2,
  },
  succeeded: {
    label: "Done",
    className: "bg-emerald-950/40 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-red-950/50 text-red-300 border-red-500/25",
    icon: XCircle,
  },
  stopped: {
    label: "Stopped",
    className: "bg-zinc-800/80 text-zinc-400 border-white/10",
    icon: OctagonX,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ScraperStatus;
  className?: string;
}) {
  const c = config[status];
  const Icon = c.icon;
  const spin = status === "running" || status === "queued";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.className,
        status === "running" && "shadow-[0_0_12px_-2px_rgba(16,185,129,0.35)]",
        className
      )}
    >
      <Icon
        className={cn("size-3.5 shrink-0", spin && "animate-spin")}
        aria-hidden
      />
      {c.label}
    </span>
  );
}
