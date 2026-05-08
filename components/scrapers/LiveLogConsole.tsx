"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Copy, Eraser, Pause, Play, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import type { LogLevel } from "@/lib/api/types";
import { useScraperLogs } from "@/lib/hooks/useScraperLogs";
import { LogLine } from "./LogLine";

const LEVELS: (LogLevel | "all")[] = ["all", "info", "warn", "error", "success"];

export function LiveLogConsole({ scraperId }: { scraperId: string }) {
  const rawLogs = useScraperLogs(scraperId);
  const { show } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rawLogs.filter((e) => {
      if (level !== "all" && e.level !== level) return false;
      if (!q) return true;
      return e.message.toLowerCase().includes(q);
    });
  }, [rawLogs, level, query]);

  useEffect(() => {
    if (!autoScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered, autoScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
      setAutoScroll(nearBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const copyLogs = useCallback(async () => {
    const text = filtered
      .map(
        (e, i) =>
          `${i + 1}\t${e.ts}\t${e.level.toUpperCase()}\t${e.message}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      show("Logs copied to clipboard", "success");
    } catch {
      show("Could not copy logs", "error");
    }
  }, [filtered, show]);

  return (
    <Card className="flex min-h-[420px] flex-col overflow-hidden md:min-h-[520px]">
      <CardHeader className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Live log</h3>
          <p className="text-xs text-zinc-500">
            {filtered.length} line{filtered.length === 1 ? "" : "s"} shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={autoScroll ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setAutoScroll((a) => !a)}
          >
            {autoScroll ? (
              <>
                <Pause className="size-3.5" /> Auto-scroll
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Resume scroll
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={copyLogs}>
            <Copy className="size-3.5" /> Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 border-t border-white/[0.06] pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              placeholder="Search logs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950/80 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  level === lv
                    ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-200"
                    : "border-transparent bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800"
                )}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[min(56vh,520px)] flex-1 overflow-auto rounded-lg border border-white/[0.06] bg-black/40 p-3"
        >
          {filtered.length === 0 ? (
            <EmptyState
              title="No log lines"
              description="Adjust filters or start a run to stream output here."
              className="border-0 bg-transparent py-12"
            />
          ) : (
            <div className="space-y-1">
              {filtered.map((e, i) => (
                <LogLine key={e.id} entry={e} index={i} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <p className="text-[10px] text-zinc-600">
          Mock stream — ring buffer max 1000 lines per source. Clear is local-only
          in this build.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 h-7 px-2 text-[10px]"
            onClick={() => {
              setQuery("");
              setLevel("all");
            }}
          >
            <Eraser className="size-3" /> Reset filters
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
