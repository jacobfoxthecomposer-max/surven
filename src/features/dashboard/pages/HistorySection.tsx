"use client";

import { Card } from "@/components/atoms/Card";
import { HistoryChart } from "@/components/organisms/HistoryChart";
import type { Scan } from "@/types/database";

interface HistorySectionProps {
  scans: Scan[];
}

export function HistorySection({ scans }: HistorySectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Visibility Over Time</h2>
      <Card>
        <HistoryChart scans={scans} />
      </Card>
    </section>
  );
}
