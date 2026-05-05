import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  // Local dev without service-role key: return empty connections instead of 500.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ connections: [] });
  }

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
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createServerClient();

  // Verify business ownership
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Return all connections for this business — no credentials exposed
  const { data: connections } = await supabaseAdmin
    .from("site_connections")
    .select("id, platform, repo, branch, site_id, site_url, status, last_verified_at, created_at")
    .eq("business_id", businessId)
    .eq("user_id", user.id);

  return NextResponse.json({ connections: connections ?? [] });
}
