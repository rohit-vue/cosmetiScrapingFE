"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useScraperLogs } from "@/lib/hooks/useScraperLogs";
import { formatTimestamp } from "@/lib/utils/format";

export function LiveLogPreview({
  scraperId,
  scraperName,
}: {
  scraperId: string;
  scraperName: string;
}) {
  const logs = useScraperLogs(scraperId);
  const recent = logs.slice(-8);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Live logs</h3>
          <p className="text-xs text-zinc-500">Streaming from {scraperName}</p>
        </div>
        <Link
          href={`/scrapers/${scraperId}`}
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          Open full console
        </Link>
      </CardHeader>
      <CardContent className="border-t border-white/[0.06] pt-3">
        {recent.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 bg-zinc-900/30 p-3 text-xs text-zinc-500">
            Waiting for logs...
          </p>
        ) : (
          <div className="max-h-52 space-y-1 overflow-auto rounded-lg border border-white/[0.06] bg-black/40 p-3">
            {recent.map((log) => (
              <div key={log.id} className="font-mono text-[11px] leading-relaxed text-zinc-300">
                <span className="mr-2 text-zinc-600">{formatTimestamp(log.ts)}</span>
                <span className="mr-2 uppercase text-zinc-500">{log.level}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

