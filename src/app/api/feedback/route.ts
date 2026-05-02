import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEEDBACK_TO = "survengeo@gmail.com";

interface FeedbackPayload {
  category?: string;
  email?: string;
  message?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  feature: "Feature request",
  bug: "Bug report",
  data: "Data request",
  other: "Other",
};

export async function POST(req: Request) {
  let body: FeedbackPayload;
  try {
    body = (await req.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const category = body.category && CATEGORY_LABELS[body.category]
    ? CATEGORY_LABELS[body.category]
    : "General";
  const email = (body.email || "").trim();
  const message = (body.message || "").trim();

  if (!message || message.length < 5) {
    return NextResponse.json(
      { error: "Message is required (minimum 5 chars)." },
      { status: 400 },
    );
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message too long (5000 char max)." },
      { status: 400 },
    );
  }

  // Prefer Resend if its API key is configured. Otherwise fall back to
  // Gmail SMTP via nodemailer if GMAIL_APP_PASSWORD is set. Otherwise
  // log to console so the form still resolves cleanly in dev.
  const subject = `[Surven Feedback] ${category}${
    email ? ` — from ${email}` : ""
  }`;
  const textBody = [
    `Category: ${category}`,
    email ? `From: ${email}` : "From: (anonymous)",
    `Submitted: ${new Date().toISOString()}`,
    "",
    "---",
    "",
    message,
  ].join("\n");

  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.RESEND_FROM ||
            "Surven Feedback <feedback@surven.ai>",
          to: [FEEDBACK_TO],
          reply_to: email || undefined,
          subject,
          text: textBody,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[feedback] Resend send failed:", res.status, txt);
        return NextResponse.json(
          { error: "Email service rejected the message." },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, via: "resend" });
    }

    if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
      // nodemailer is dynamically imported so the route doesn't need it
      // installed at build time when Resend is preferred.
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: `"Surven Feedback" <${process.env.GMAIL_USER}>`,
        to: FEEDBACK_TO,
        replyTo: email || undefined,
        subject,
        text: textBody,
      });
      return NextResponse.json({ ok: true, via: "gmail-smtp" });
    }

    // Fallback: log only. Form succeeds so the user gets the
    // thank-you state, but the message lands in server logs only.
    console.log("[feedback] No email transport configured. Payload:", {
      category,
      email,
      message,
    });
    return NextResponse.json({ ok: true, via: "console" });
  } catch (err) {
    console.error("[feedback] send failed:", err);
    return NextResponse.json(
      { error: "Failed to send feedback. Please try again." },
      { status: 500 },
    );
  }
}
