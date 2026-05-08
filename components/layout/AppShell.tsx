"use client";

import type { Scraper } from "@/lib/api/types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({
  children,
  scrapers,
}: {
  children: React.ReactNode;
  scrapers: Scraper[];
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:min-w-0">
        <TopBar scrapers={scrapers} />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
