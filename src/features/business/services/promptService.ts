import { supabase } from "@/services/supabase";
import type { SearchPrompt } from "@/types/database";

export async function getSearchPrompts(businessId: string): Promise<SearchPrompt[]> {
  const { data, error } = await supabase
    .from("search_prompts")
    .select("*")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addSearchPrompt(
  businessId: string,
  promptText: string
): Promise<SearchPrompt> {
  const { data, error } = await supabase
    .from("search_prompts")
    .insert({ business_id: businessId, prompt_text: promptText })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSearchPrompt(promptId: string): Promise<void> {
  const { error } = await supabase
    .from("search_prompts")
    .delete()
    .eq("id", promptId);
  if (error) throw error;
}
