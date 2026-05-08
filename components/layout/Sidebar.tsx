"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PanelLeftClose, PanelLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const nav = [{ href: "/", label: "Dashboard", icon: LayoutDashboard }];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/90 text-zinc-200 backdrop-blur-md md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <PanelLeft className="size-5" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/[0.06] bg-zinc-950/95 backdrop-blur-xl transition-all duration-300 md:static md:z-0",
          collapsed ? "w-[72px]" : "w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-white/[0.06] px-3 md:h-16">
          {!collapsed ? (
            <Link
              href="/"
              className="truncate pl-10 text-sm font-semibold tracking-tight text-zinc-100 md:pl-0"
              onClick={() => setMobileOpen(false)}
            >
              Cosmetic Scrape
            </Link>
          ) : (
            <span className="w-8 md:mx-auto" aria-hidden />
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <Icon className="size-[18px] shrink-0 opacity-90" />
                {!collapsed ? <span>{label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
