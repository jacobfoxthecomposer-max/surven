import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/services/supabase";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json().catch(() => ({}));

  const { data, error } = await supabase.rpc("create_extension_api_key", {
    p_user_id: user.id,
    p_key_name: name || "Default Key",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || !data[0]) {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  const [result] = data;

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ apiKey: result.key }, { status: 201 });
}
