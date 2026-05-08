"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Scraper } from "@/lib/api/types";

export function useScrapers() {
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void api.list().then((s) => {
      if (mounted) {
        setScrapers(s);
        setReady(true);
      }
    });
    const unsub = api.subscribeScrapers((s) => {
      if (mounted) setScrapers(s);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { scrapers, ready };
}
