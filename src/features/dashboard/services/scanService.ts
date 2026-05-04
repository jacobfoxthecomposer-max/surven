import { supabase } from "@/services/supabase";
import { runMockScan, type MockScanInput } from "@/services/mockScanEngine";
import type { Scan, ScanResult, ScanWithResults } from "@/types/database";

export async function createScanForBusiness(
  businessId: string,
  input: MockScanInput,
  customPrompts: string[] = [],
  scanType: "manual" | "automated" = "manual"
): Promise<ScanWithResults> {
  type ResultRow = Omit<ScanResult, "id" | "scan_id" | "created_at">;
  let scanOutput: {
    visibilityScore: number;
    results: ResultRow[];
    modelScores?: Record<string, number>;
  };

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, customPrompts }),
  });

  if (res.status === 429) {
    const json = await res.json();
    throw new Error(json.error ?? "Scan limit reached. Please try again later.");
  }

  if (res.ok) {
    const json = await res.json();
    if (json.useMock) {
      scanOutput = runMockScan({ ...input, customPrompts });
    } else {
      scanOutput = {
        visibilityScore: json.visibilityScore,
        results: json.results,
        modelScores: json.modelScores,
      };
    }
  } else {
    scanOutput = runMockScan({ ...input, customPrompts });
  }

  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      business_id: businessId,
      visibility_score: scanOutput.visibilityScore,
      scan_type: scanType,
      model_scores: scanOutput.modelScores ?? null,
    })
    .select()
    .single();

  if (scanError) throw scanError;

  const resultRows = scanOutput.results.map((r) => ({
    scan_id: scan.id,
    ...r,
  }));

  const { data: results, error: resultsError } = await supabase
    .from("scan_results")
    .insert(resultRows)
    .select();

  if (resultsError) throw resultsError;

  return { ...scan, results: results ?? [] };
}

export async function getLatestScan(businessId: string): Promise<ScanWithResults | null> {
  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!scan) return null;

  const { data: results, error: resultsError } = await supabase
    .from("scan_results")
    .select("*")
    .eq("scan_id", scan.id);

  if (resultsError) throw resultsError;

  return { ...scan, results: results ?? [] };
}

export async function getScanHistory(businessId: string): Promise<Scan[]> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getScanResults(scanId: string): Promise<ScanResult[]> {
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("scan_id", scanId);

  if (error) throw error;
  return data ?? [];
}

export async function getScansWithResultsInRange(
  businessId: string,
  start: Date | null,
  end: Date | null,
): Promise<ScanWithResults[]> {
  let query = supabase
    .from("scans")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (start) query = query.gte("created_at", start.toISOString());
  if (end) query = query.lte("created_at", end.toISOString());

  const { data: scans, error } = await query;
  if (error) throw error;
  if (!scans || scans.length === 0) return [];

  const scanIds = scans.map((s) => s.id);
  const { data: results, error: resultsError } = await supabase
    .from("scan_results")
    .select("*")
    .in("scan_id", scanIds);

  if (resultsError) throw resultsError;

  const resultsByScan = new Map<string, ScanResult[]>();
  for (const r of results ?? []) {
    const existing = resultsByScan.get(r.scan_id);
    if (existing) existing.push(r);
    else resultsByScan.set(r.scan_id, [r]);
  }

  return scans.map((s) => ({ ...s, results: resultsByScan.get(s.id) ?? [] }));
}
