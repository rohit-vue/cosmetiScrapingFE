"use client";

import { useScrapers } from "@/lib/hooks/useScrapers";
import { AppShell } from "./AppShell";
import { Spinner } from "@/components/ui/Spinner";

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { scrapers, ready } = useScrapers();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Spinner size="lg" />
          <span className="text-sm">Loading scrapers…</span>
        </div>
      </div>
    );
  }

  return <AppShell scrapers={scrapers}>{children}</AppShell>;
}
