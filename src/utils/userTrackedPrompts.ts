/**
 * User-tracked prompts — localStorage layer.
 *
 * When a user adds a prompt to the Tracker on /prompt-research, we persist
 * it here so /prompts (Tracked Prompts page) can surface it too. This is
 * the bridge between the two pages until a real Supabase-backed
 * tracked_prompts table lands. Plug-and-play surface — when the API is
 * wired, swap the read/write functions to hit Supabase. Subscribers don't
 * need to change.
 *
 * Notes:
 * - Keyed by intent id from prompt-research, NOT by prompt text. Stable
 *   across phrasing tweaks.
 * - addedAt is ISO so /prompts can sort newest-first or render a "just
 *   added" affordance against a freshness window.
 * - Cross-tab sync via the `storage` event + intra-tab via a custom event
 *   so adding a prompt on one tab updates the table on another tab.
 */

import type { IntentType } from "@/features/prompt-research/types";

export interface UserTrackedPrompt {
  /** Intent id from prompt-research. Stable. */
  id: string;
  /** The prompt text shown in the Tracked Prompts table. */
  canonical: string;
  /** Intent classification (Informational / Local / Comparison / Use-case / Transactional). */
  intentType: IntentType;
  /** How many variants this intent has — surfaced on the row. */
  variantCount: number;
  /** ISO timestamp the user added it. */
  addedAt: string;
  /** Origin surface — useful for analytics + conditional indicators. */
  source: "prompt-research" | "manual" | "import";
}

const KEY = "surven.userTrackedPrompts";
const EVT = "surven:userTrackedPromptsChange";

export function readUserTrackedPrompts(): UserTrackedPrompt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: UserTrackedPrompt[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function addUserTrackedPrompt(p: UserTrackedPrompt): void {
  const list = readUserTrackedPrompts();
  // Dedupe by id — re-adding is a no-op so the addedAt stamp doesn't reset.
  if (list.some((x) => x.id === p.id)) return;
  list.push(p);
  writeAll(list);
}

export function removeUserTrackedPrompt(id: string): void {
  const list = readUserTrackedPrompts().filter((x) => x.id !== id);
  writeAll(list);
}

export function clearUserTrackedPrompts(): void {
  writeAll([]);
}

/**
 * Subscribe to user-tracked-prompts changes. Returns an unsubscribe
 * function. Fires for both same-tab edits (custom event) and cross-tab
 * edits (native `storage` event).
 */
export function subscribeUserTrackedPrompts(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    if (e.type === "storage" && (e as StorageEvent).key !== KEY) return;
    cb();
  };
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
