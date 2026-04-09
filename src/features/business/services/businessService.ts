import { supabase } from "@/services/supabase";
import type { Business, Competitor } from "@/types/database";

export async function createBusiness(
  userId: string,
  data: { name: string; industry: string; city: string; state: string }
): Promise<Business> {
  const { data: business, error } = await supabase
    .from("businesses")
    .insert({ user_id: userId, ...data })
    .select()
    .single();
  if (error) throw error;
  return business;
}

export async function getBusiness(userId: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getAllBusinesses(userId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateBusiness(
  businessId: string,
  data: Partial<Pick<Business, "name" | "industry" | "city" | "state">>
): Promise<Business> {
  const { data: business, error } = await supabase
    .from("businesses")
    .update(data)
    .eq("id", businessId)
    .select()
    .single();
  if (error) throw error;
  return business;
}

export async function addCompetitors(
  businessId: string,
  names: string[]
): Promise<Competitor[]> {
  const rows = names.map((name) => ({ business_id: businessId, name }));
  const { data, error } = await supabase
    .from("competitors")
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function getCompetitors(
  businessId: string
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw error;
  return data ?? [];
}

export async function deleteCompetitors(businessId: string): Promise<void> {
  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("business_id", businessId);
  if (error) throw error;
}

export async function deleteBusiness(businessId: string): Promise<void> {
  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", businessId);
  if (error) throw error;
}

export async function addCompetitor(
  businessId: string,
  name: string
): Promise<Competitor> {
  const { data, error } = await supabase
    .from("competitors")
    .insert({ business_id: businessId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompetitor(competitorId: string): Promise<void> {
  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("id", competitorId);
  if (error) throw error;
}
