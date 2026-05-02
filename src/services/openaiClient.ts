/**
 * OpenAI client helper — used by /api/audit/generate for Sprint 1 features
 * (meta rewriter, title rewriter, FAQ generator, alt-text generator).
 *
 * Mirrors the raw-fetch pattern used in src/app/api/scan/route.ts queryClaude.
 * No SDK dependency — keeps the bundle lean and avoids version coupling.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 30_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export interface OpenAIChatOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface OpenAIResult {
  ok: boolean;
  content?: string;
  error?: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function openaiChat(options: OpenAIChatOptions): Promise<OpenAIResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: options.messages,
    max_tokens: options.maxTokens ?? 600,
    temperature: options.temperature ?? 0.4,
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `OpenAI ${res.status}: ${errText.slice(0, 300)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { ok: false, error: "OpenAI returned no message content" };
    }

    return {
      ok: true,
      content,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function openaiChatJson<T>(options: OpenAIChatOptions): Promise<{ ok: boolean; data?: T; error?: string }> {
  const result = await openaiChat({ ...options, jsonMode: true });
  if (!result.ok || !result.content) return { ok: false, error: result.error };
  try {
    return { ok: true, data: JSON.parse(result.content) as T };
  } catch (err) {
    return { ok: false, error: `Failed to parse JSON: ${err instanceof Error ? err.message : "unknown"}` };
  }
}
