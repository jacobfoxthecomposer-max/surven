import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";
import { z } from "zod";

const DisconnectSchema = z.object({
  businessId: z.string().uuid(),
  platform: z.enum(["github", "vercel", "wordpress", "webflow", "wix", "shopify"]),
});

export async function DELETE(request: NextRequest) {
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

  const body = await request.json().catch(() => null);
  const parse = DisconnectSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const supabaseAdmin = createServerClient();

  const { error } = await supabaseAdmin
    .from("site_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("business_id", parse.data.businessId)
    .eq("platform", parse.data.platform);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
