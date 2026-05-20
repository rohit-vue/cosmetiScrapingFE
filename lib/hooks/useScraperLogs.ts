"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LogEntry } from "@/lib/api/types";

export function useScraperLogs(scraperId: string) {
  const [state, setState] = useState<{ scraperId: string; logs: LogEntry[] }>({
    scraperId,
    logs: [],
  });

  useEffect(() => {
    return api.subscribeLogs(scraperId, (entries) => {
      setState({ scraperId, logs: entries });
    });
  }, [scraperId]);

  return state.scraperId === scraperId ? state.logs : [];
}
