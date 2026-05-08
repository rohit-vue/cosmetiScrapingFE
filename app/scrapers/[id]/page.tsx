"use client";

import { useParams } from "next/navigation";
import { ScraperDetailView } from "@/components/scrapers/ScraperDetailView";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ScraperPage() {
  const params = useParams();
  const id = params?.id;

  if (typeof id !== "string" || !id) {
    return (
      <EmptyState
        title="Invalid route"
        description="Missing scraper id."
      />
    );
  }

  return <ScraperDetailView scraperId={id} />;
}
