import { supabase } from "@/services/supabase";
import { runMockScan, type MockScanInput } from "@/services/mockScanEngine";
import type { Scan, ScanResult, ScanWithResults } from "@/types/database";

export async function createScan(input: MockScanInput): Promise<ScanWithResults> {
  const mockOutput = runMockScan(input);

  // Insert the scan
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      business_id: input.businessName, // Will be replaced with actual business_id
      visibility_score: mockOutput.visibilityScore,
    })
    .select()
    .single();

  if (scanError) throw scanError;

  // Insert all results
  const resultRows = mockOutput.results.map((r) => ({
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

export async function createScanForBusiness(
  businessId: string,
  input: MockScanInput
): Promise<ScanWithResults> {
  const mockOutput = runMockScan(input);

  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      business_id: businessId,
      visibility_score: mockOutput.visibilityScore,
    })
    .select()
    .single();

  if (scanError) throw scanError;

  const resultRows = mockOutput.results.map((r) => ({
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
