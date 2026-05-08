"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { AutoDownloadWatcher } from "@/components/AutoDownloadWatcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AutoDownloadWatcher />
      {children}
    </ToastProvider>
  );
}
