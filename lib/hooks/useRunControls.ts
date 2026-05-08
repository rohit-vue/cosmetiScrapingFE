"use client";

import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";

export function useRunControls() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelectedMany = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const runSelected = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    await api.start(ids);
  }, [selected]);

  const stopAll = useCallback(async () => {
    const list = await api.list();
    const running = list
      .filter((s) => s.status === "running" || s.status === "queued")
      .map((s) => s.id);
    if (running.length) await api.stop(running);
  }, []);

  const startOne = useCallback(async (id: string) => {
    await api.start([id]);
  }, []);

  const stopOne = useCallback(async (id: string) => {
    await api.stop([id]);
  }, []);

  return useMemo(
    () => ({
      selected,
      selectedIds: [...selected],
      toggle,
      setSelectedMany,
      clearSelection,
      runSelected,
      stopAll,
      startOne,
      stopOne,
    }),
    [
      selected,
      toggle,
      setSelectedMany,
      clearSelection,
      runSelected,
      stopAll,
      startOne,
      stopOne,
    ]
  );
}
