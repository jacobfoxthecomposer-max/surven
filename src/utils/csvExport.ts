import type { ScanResult, ScanWithResults } from "@/types/database";

function escapeCsv(value: string | boolean | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(values: (string | boolean | number)[]): string {
  return values.map(escapeCsv).join(",");
}

export function exportScanResultsAsCsv(scan: ScanWithResults, businessName: string): void {
  const competitorNames = Array.from(
    new Set(scan.results.flatMap((r) => Object.keys(r.competitor_mentions)))
  );

  const headers = [
    "prompt",
    "model",
    "business_mentioned",
    ...competitorNames.map((c) => `competitor_${c}`),
    "response",
  ];

  const rows: string[] = [headers.join(",")];

  for (const result of scan.results) {
    const competitorCols = competitorNames.map(
      (c) => result.competitor_mentions[c] ?? false
    );
    rows.push(
      rowToCsv([
        result.prompt_text,
        result.model_name,
        result.business_mentioned,
        ...competitorCols,
        result.response_text,
      ])
    );
  }

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const date = new Date(scan.created_at).toISOString().slice(0, 10);
  const filename = `${businessName.replace(/\s+/g, "_")}_scan_${date}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
