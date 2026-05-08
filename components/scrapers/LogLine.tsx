import { cn } from "@/lib/utils/cn";
import { formatTimestamp } from "@/lib/utils/format";
import type { LogEntry, LogLevel } from "@/lib/api/types";

const levelStyles: Record<LogLevel, string> = {
  info: "text-zinc-400",
  warn: "text-amber-400/90",
  error: "text-red-400",
  success: "text-emerald-400",
};

export function LogLine({
  entry,
  index,
}: {
  entry: LogEntry;
  index: number;
}) {
  return (
    <div className="flex gap-3 font-mono text-[11px] leading-relaxed md:text-xs">
      <span className="w-8 shrink-0 text-right text-zinc-600 tabular-nums">
        {index + 1}
      </span>
      <span className="shrink-0 text-zinc-600">{formatTimestamp(entry.ts)}</span>
      <span
        className={cn(
          "w-14 shrink-0 font-semibold uppercase tracking-wide",
          levelStyles[entry.level]
        )}
      >
        {entry.level}
      </span>
      <span className="min-w-0 flex-1 break-all text-zinc-200">{entry.message}</span>
    </div>
  );
}
