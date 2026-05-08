import { cn } from "@/lib/utils/cn";
import type { ScraperStatus } from "@/lib/api/types";

export function ProgressBar({
  status,
  progress,
  className,
}: {
  status: ScraperStatus;
  progress: number;
  className?: string;
}) {
  const indeterminate = status === "queued";
  const active = status === "running" || status === "queued";

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-zinc-800/80 ring-1 ring-inset ring-white/[0.04]",
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : progress}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          indeterminate &&
            "w-[40%] animate-shimmer bg-gradient-to-r from-emerald-900/40 via-emerald-500/70 to-emerald-900/40 bg-[length:200%_100%]",
          !indeterminate &&
            active &&
            "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:1rem_100%] animate-progress-stripes",
          !indeterminate && !active && "bg-zinc-600",
          !indeterminate && !active && progress > 0 && "bg-emerald-700/80"
        )}
        style={
          indeterminate
            ? undefined
            : { width: `${Math.min(100, Math.max(0, progress))}%` }
        }
      />
    </div>
  );
}
