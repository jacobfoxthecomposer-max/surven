import { supabase } from "@/services/supabase";
import { runMockScan, type MockScanInput } from "@/services/mockScanEngine";
import type { Scan, ScanResult, ScanWithResults } from "@/types/database";

export async function createScanForBusiness(
  businessId: string,
  input: MockScanInput,
  scanType: "manual" | "automated" = "manual"
): Promise<ScanWithResults> {
  type ResultRow = Omit<ScanResult, "id" | "scan_id" | "created_at">;
  let scanOutput: {
    visibilityScore: number;
    results: ResultRow[];
    modelScores?: Record<string, number>;
  };

  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, businessId }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.useMock) {
        scanOutput = runMockScan(input);
      } else {
        scanOutput = {
          visibilityScore: json.visibilityScore,
          results: json.results,
          modelScores: json.modelScores,
        };
      }
    } else {
      scanOutput = runMockScan(input);
    }
  } catch {
    scanOutput = runMockScan(input);
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
