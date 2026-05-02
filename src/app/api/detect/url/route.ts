import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { detectFromUrl } from "@/utils/frameworkDetection";

const Schema = z.object({
  url: z.string().min(3),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let url = parse.data.url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const result = await detectFromUrl(url);
  return NextResponse.json({ result });
}
