"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LogEntry } from "@/lib/api/types";

export function useScraperLogs(scraperId: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    return api.subscribeLogs(scraperId, setLogs);
  }, [scraperId]);

  return logs;
}
