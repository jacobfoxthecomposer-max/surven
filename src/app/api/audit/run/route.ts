import { NextRequest, NextResponse } from "next/server";
import { crawlWebsite } from "@/utils/crawler";
import { analyzeWebsite } from "@/utils/analyzeWebsite";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.EXTENSION_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const siteUrl = body?.siteUrl;

  if (!siteUrl) {
    return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });
  }

  try {
    new URL(siteUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const { pages, hitLimit, durationMs } = await crawlWebsite(siteUrl);

    if (pages[0]?.statusCode === 0) {
      return NextResponse.json(
        { error: "Could not reach that website. Check the URL and try again." },
        { status: 422 }
      );
    }

    const findings = analyzeWebsite(pages);

    return NextResponse.json({
      findings,
      crawlStats: {
        pagesCrawled: pages.length,
        pagesCapped: hitLimit,
        crawlDurationMs: durationMs,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 }
    );
  }
}
