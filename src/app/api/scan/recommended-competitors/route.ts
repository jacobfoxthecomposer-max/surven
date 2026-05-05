import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";
import { z } from "zod";

const RECOMMEND_LIMITS = { free: 0, plus: 1, premium: 5, admin: 5 } as const;

const RequestSchema = z.object({
  businessId: z.string().uuid(),
});

type Recommendation = { name: string; mentions: number };

async function extractCompetitorsWithClaude(
  responseTexts: string[],
  businessName: string,
  industry: string,
  excludeNames: string[],
): Promise<Recommendation[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];

  const corpus = responseTexts
    .filter((t) => t && t.length > 0)
    .map((t, i) => `--- Response ${i + 1} ---\n${t.slice(0, 1500)}`)
    .join("\n\n")
    .slice(0, 18000);

  if (corpus.length === 0) return [];

  const exclude = [businessName, ...excludeNames]
    .map((n) => n.trim())
    .filter(Boolean)
    .join(", ");

  const prompt = `You are reviewing AI search responses for a ${industry} business named "${businessName}". Extract every other distinct business name that appears in these responses (they are competitors). Do NOT include "${businessName}" or these already-tracked names: ${exclude || "(none)"}.

Return ONLY a JSON array of objects, sorted by mention frequency (most-mentioned first). Use this exact shape:
[{"name": "Business Name", "mentions": 4}, {"name": "Other Business", "mentions": 2}]

Rules:
- Names must be real, specific business names (not generic phrases like "local dentists" or category descriptions).
- Combine obvious aliases ("Joe's Pizza" and "Joe's") into one entry.
- Skip directories, review platforms, and aggregators (Yelp, Google Maps, Healthgrades, etc.).
- "mentions" = number of distinct responses the business appears in (not total occurrences).
- Return an empty array [] if nothing qualifies.
- Output ONLY the JSON array. No prose, no code fences.

Responses:
${corpus}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const jsonSlice = text.slice(start, end + 1);

    const parsed = JSON.parse(jsonSlice);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Recommendation =>
          item &&
          typeof item === "object" &&
          typeof item.name === "string" &&
          item.name.trim().length > 0 &&
          typeof item.mentions === "number" &&
          item.mentions > 0,
      )
      .map((item) => ({ name: item.name.trim(), mentions: Math.round(item.mentions) }));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createSupabaseSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parse = RequestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { businessId } = parse.data;

  const supabase = createServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, user_id, name, industry")
    .eq("id", businessId)
    .single();

  if (!business || business.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = (profile?.plan ?? "free") as keyof typeof RECOMMEND_LIMITS;
  const limit = RECOMMEND_LIMITS[plan] ?? 0;

  if (limit === 0) {
    return NextResponse.json({ recommendations: [], plan, limit });
  }

  const { data: latestScan } = await supabase
    .from("scans")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestScan) {
    return NextResponse.json({ recommendations: [], plan, limit });
  }

  const { data: scanResults } = await supabase
    .from("scan_results")
    .select("response_text")
    .eq("scan_id", latestScan.id);

  const responseTexts = (scanResults ?? [])
    .map((r) => r.response_text)
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  if (responseTexts.length === 0) {
    return NextResponse.json({ recommendations: [], plan, limit });
  }

  const { data: existingCompetitors } = await supabase
    .from("competitors")
    .select("name")
    .eq("business_id", businessId);

  const excludeNames = (existingCompetitors ?? []).map((c) => c.name);

  const candidates = await extractCompetitorsWithClaude(
    responseTexts,
    business.name,
    business.industry,
    excludeNames,
  );

  const lowerExclude = new Set(
    [business.name, ...excludeNames].map((n) => n.toLowerCase().trim()),
  );

  const recommendations = candidates
    .filter((c) => !lowerExclude.has(c.name.toLowerCase().trim()))
    .slice(0, limit);

  return NextResponse.json({ recommendations, plan, limit });
}
