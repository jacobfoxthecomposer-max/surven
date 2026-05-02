import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook signature verifiers for incoming requests from external platforms.
 * Each verifier is constant-time to prevent timing attacks.
 */

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function safeEqualBase64(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "base64");
    const bufB = Buffer.from(b, "base64");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * GitHub webhooks send X-Hub-Signature-256: sha256=<hex>
 * https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */
export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const received = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(received, expected);
}

/**
 * Stripe webhooks send Stripe-Signature: t=<ts>,v1=<hex>
 * https://stripe.com/docs/webhooks/signatures
 * Tolerance defaults to 5 minutes per Stripe's recommendation.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",");
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t" && value) timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) return false;

  const signed = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  return signatures.some((s) => safeEqualHex(s, expected));
}

/**
 * Shopify webhooks send X-Shopify-Hmac-Sha256: <base64>
 * https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
 */
export function verifyShopifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeEqualBase64(signatureHeader, expected);
}

/**
 * Generic HMAC-SHA256 verifier — header value is plain hex.
 * Used by Vercel, custom webhooks, and any platform documenting raw HMAC.
 */
export function verifyGenericHmacHex(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(signatureHeader, expected);
}

/**
 * Read the raw body of a Web Request as a string.
 * Required for HMAC verification — do not parse JSON first.
 */
export async function readRawBody(request: Request): Promise<string> {
  return await request.text();
}
