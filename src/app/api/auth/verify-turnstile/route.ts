import { NextResponse } from "next/server";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// When TURNSTILE_SECRET_KEY isn't set (local dev or before Jake wires keys),
// short-circuit to success so the signup flow keeps working. Once the env
// var lands, the real verification kicks in automatically.
export async function POST(req: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return NextResponse.json({ success: true, dev: true });
  }

  let token: string | undefined;
  try {
    const body = await req.json();
    token = body?.token;
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { success: false, error: "missing_token" },
      { status: 400 },
    );
  }

  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

  if (!data.success) {
    return NextResponse.json(
      { success: false, errors: data["error-codes"] ?? [] },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true });
}
