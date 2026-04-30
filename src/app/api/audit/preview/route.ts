import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import Steel from "steel-sdk";
import puppeteer from "puppeteer-core";

export const maxDuration = 30;

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createSupabaseSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — create a Steel session and navigate to the target URL
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteUrl } = await request.json();
  if (!siteUrl) return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });

  try {
    new URL(siteUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

  const session = await client.sessions.create({
    timeout: 300_000, // 5 minutes
    dimensions: { width: 1280, height: 800 },
  });

  // Navigate to the target URL via puppeteer-core (doesn't include Chrome — connects to Steel's cloud browser)
  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`,
    });
    const pages = await browser.pages();
    const page = pages[0] ?? await browser.newPage();
    await page.goto(siteUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await browser.disconnect(); // keep Steel session alive, just drop puppeteer connection
  } catch {
    // Navigation failed — session still usable, user can interact manually
  }

  return NextResponse.json({
    sessionId: session.id,
    viewerUrl: `${session.debugUrl}?interactive=true&showControls=true`,
  });
}

// DELETE — release the Steel session to stop billing
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await request.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
  await client.sessions.release(sessionId);

  return NextResponse.json({ ok: true });
}
