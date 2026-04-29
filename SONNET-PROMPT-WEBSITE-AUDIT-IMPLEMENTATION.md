# Website Audit & Analysis Feature — Implementation Prompt

**For:** Claude Sonnet (or Opus for complex crawling logic)  
**Scope:** Build Website Audit & Analysis feature for Surven Tracker  
**Based on:** WEBSITE-AUDIT-FEATURE-AUDIT-2026-04-27.md — 6 key risks identified  
**Deliverable:** Working audit page with URL input, website preview, crawl, analysis, and findings display

---

## Context

Surven is a GEO (Generative Engine Optimization) agency helping businesses rank higher in AI tools. The Tracker currently shows:
- Business mention counts across models (ChatGPT, Claude, Gemini, Google AI)
- Sentiment analysis
- Visibility score (0-100)

**New Feature:** Website Audit & Analysis  
Users enter their business website URL → Surven crawls it → shows what's good/bad for AI visibility → displays findings with severity, time-to-fix, and impact estimates.

**Example:** User audits `acme-plumbing.com`. Audit finds:
- ✅ GOOD: Structured data (schema markup) present
- ❌ CRITICAL: No FAQ schema (AI models prefer it for answer capsules)
- ❌ HIGH: Meta descriptions are all under 50 chars (should be 50-160)
- ⚠️ MEDIUM: Last content update was 6 months ago (stale for AI recency signals)

**Brand:** Specimen Sage (#96A283), Archival Cream (#F2EEE3), Cabinet Ink (#1A1C1A), Rubric Red (#B54631)

---

## Architecture Overview

```
User → AuditPage (URL input) 
  → API: POST /api/audit/scan (kicks off async job)
    → Crawler (crawl site, extract content/metadata)
    → Analyzer (apply audit rules)
    → Store results in DB
  → WebsitePreview (iframe or screenshot of site)
  → AuditFindings (display results, grouped by severity)
```

**Key Constraints (from audit):**
- Crawl time: max 30s per site (abort if longer)
- Crawl depth: max 100 pages (warn user)
- Concurrent crawls: max 3 per user (queue others)
- Cache: 24 hours with manual refresh
- Preview: Sandboxed iframe with CSP headers
- Audit rules: Start with 7 rules (schema, freshness, meta, etc.)

---

## Implementation Steps

### Step 1: Define Audit Rules & Types

**File:** `src/types/audit.ts`

```typescript
export type AuditSeverity = "critical" | "high" | "medium" | "low";

export interface AuditFinding {
  id: string; // "schema_faq_missing", "meta_desc_short", etc.
  title: string; // "FAQ Schema Missing"
  description: string; // "AI models prefer FAQ schema for answer capsules..."
  severity: AuditSeverity;
  affectedPages: number; // How many pages have this issue
  estimatedFixTime: number; // Minutes
  estimatedImpact: number; // 1-10 scale, 10 = most important for AI visibility
  recommendation: string; // "Add FAQ schema to pages about common questions"
  learnMoreUrl?: string;
}

export interface AuditResult {
  id: string;
  businessId: string;
  siteUrl: string;
  scanStartedAt: Date;
  scanCompletedAt: Date | null;
  status: "scanning" | "completed" | "failed";
  errorMessage?: string;
  findings: AuditFinding[];
  crawlStats: {
    pagesCrawled: number;
    pagesCapped: boolean; // true if hit 100-page limit
    crawlDurationMs: number;
  };
  cacheExpiresAt: Date;
}

export interface CrawledPage {
  url: string;
  title: string;
  metaDescription: string;
  h1: string[];
  content: string; // Full text content (truncated if >10k chars)
  schemaTypes: string[]; // "FAQPage", "Organization", etc.
  lastModified?: Date; // From HTTP headers or <meta> if available
  statusCode: number;
}
```

**File:** `src/utils/auditRules.ts`

```typescript
import type { CrawledPage, AuditFinding } from "@/types/audit";

// Audit rules: each rule checks crawled pages and returns findings if violated
export const AUDIT_RULES = [
  {
    id: "schema_faq_missing",
    title: "FAQ Schema Missing",
    description:
      "FAQ schema markup helps AI models understand Q&A content and may improve answer capsule visibility.",
    severity: "high" as const,
    estimatedFixTime: 45,
    estimatedImpact: 8,
    recommendation:
      "Add FAQPage schema to pages with frequently asked questions. Use schema.org FAQPage type.",
    checkPages: (pages: CrawledPage[]): AuditFinding | null => {
      const pagesWithoutFaq = pages.filter(
        (p) => !p.schemaTypes.includes("FAQPage")
      );
      if (pagesWithoutFaq.length > 0) {
        return {
          id: "schema_faq_missing",
          title: "FAQ Schema Missing",
          description: "...",
          severity: "high",
          affectedPages: pagesWithoutFaq.length,
          estimatedFixTime: 45,
          estimatedImpact: 8,
          recommendation: "...",
        };
      }
      return null;
    },
  },
  {
    id: "meta_desc_length",
    title: "Meta Descriptions Too Short",
    description:
      "Meta descriptions under 50 characters may be truncated in AI outputs, reducing click-through.",
    severity: "medium" as const,
    estimatedFixTime: 20,
    estimatedImpact: 5,
    recommendation: "Expand meta descriptions to 50-160 characters.",
    checkPages: (pages: CrawledPage[]): AuditFinding | null => {
      const shortDescs = pages.filter(
        (p) => p.metaDescription && p.metaDescription.length < 50
      );
      if (shortDescs.length > 0) {
        return {
          id: "meta_desc_length",
          title: "Meta Descriptions Too Short",
          description: "...",
          severity: "medium",
          affectedPages: shortDescs.length,
          estimatedFixTime: 20,
          estimatedImpact: 5,
          recommendation: "...",
        };
      }
      return null;
    },
  },
  // Additional rules: schema_org_missing, content_freshness_stale, h1_missing, duplicate_titles, etc.
  // Start with 5-7 rules; add more after launch
];
```

---

### Step 2: Build the Crawler with Limits

**File:** `src/utils/crawler.ts`

```typescript
import type { CrawledPage } from "@/types/audit";

const CRAWL_TIMEOUT_MS = 30000; // 30 second hard limit
const MAX_PAGES = 100; // Max pages to crawl per site
const CONCURRENT_REQUESTS = 3; // Max 3 parallel requests per crawl
const USER_AGENT = "SurvenAI/1.0 (+https://surven.ai/crawler)";

export interface CrawlerOptions {
  siteUrl: string;
  maxPages?: number;
  timeoutMs?: number;
  onProgress?: (crawled: number, total: number) => void;
}

export async function crawlWebsite(options: CrawlerOptions): Promise<{
  pages: CrawledPage[];
  hitLimit: boolean;
  durationMs: number;
}> {
  const {
    siteUrl,
    maxPages = MAX_PAGES,
    timeoutMs = CRAWL_TIMEOUT_MS,
    onProgress,
  } = options;

  const startTime = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    // Fetch + parse homepage
    const homepage = await fetchAndParsePage(siteUrl);
    const visited = new Set<string>([siteUrl]);
    const toVisit = extractLinks(homepage, siteUrl)
      .slice(0, maxPages - 1) // Save 1 slot for homepage
      .filter((url) => isSameOrigin(url, siteUrl));

    const crawledPages: CrawledPage[] = [homepage];
    onProgress?.(1, toVisit.length + 1);

    // Crawl linked pages in parallel batches (respect CONCURRENT_REQUESTS limit)
    for (let i = 0; i < toVisit.length; i += CONCURRENT_REQUESTS) {
      if (crawledPages.length >= maxPages || abortController.signal.aborted) {
        break;
      }

      const batch = toVisit
        .slice(i, i + CONCURRENT_REQUESTS)
        .filter((url) => !visited.has(url));

      const batchResults = await Promise.allSettled(
        batch.map((url) => fetchAndParsePage(url, abortController.signal))
      );

      for (const result of batchResults) {
        if (
          result.status === "fulfilled" &&
          crawledPages.length < maxPages
        ) {
          crawledPages.push(result.value);
          visited.add(result.value.url);
        }
      }

      onProgress?.(crawledPages.length, toVisit.length + 1);
    }

    return {
      pages: crawledPages,
      hitLimit: crawledPages.length >= maxPages,
      durationMs: Date.now() - startTime,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAndParsePage(
  url: string,
  signal?: AbortSignal
): Promise<CrawledPage> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal,
      timeout: 5000,
    });

    if (!response.ok) {
      return {
        url,
        title: "",
        metaDescription: "",
        h1: [],
        content: "",
        schemaTypes: [],
        statusCode: response.status,
      };
    }

    const html = await response.text();
    const title =
      html.match(/<title>([^<]+)<\/title>/i)?.[1] || "";
    const metaDescription =
      html
        .match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || "";
    const h1 = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map(
      (m) => m[1]
    );
    const schemaTypes = [
      ...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g),
    ].map((m) => m[1]);

    // Extract text content (simple version; for production, use DOMParser or htmlparser2)
    const content = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 10000);

    return {
      url,
      title,
      metaDescription,
      h1,
      content,
      schemaTypes,
      statusCode: 200,
    };
  } catch (err) {
    return {
      url,
      title: "",
      metaDescription: "",
      h1: [],
      content: "",
      schemaTypes: [],
      statusCode: 0, // Indicates network/timeout error
    };
  }
}

function extractLinks(page: CrawledPage, baseUrl: string): string[] {
  // In production: parse HTML properly and resolve relative URLs
  // For now: return empty (placeholder)
  return [];
}

function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    return urlObj.origin === baseObj.origin;
  } catch {
    return false;
  }
}
```

---

### Step 3: Build the Analyzer

**File:** `src/utils/analyzeWebsite.ts`

```typescript
import { AUDIT_RULES } from "./auditRules";
import type { CrawledPage, AuditFinding } from "@/types/audit";

export function analyzeWebsite(
  pages: CrawledPage[]
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const rule of AUDIT_RULES) {
    const finding = rule.checkPages(pages);
    if (finding) {
      findings.push(finding);
    }
  }

  // Sort by severity (critical → high → medium → low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return findings;
}
```

---

### Step 4: Build the API Endpoint

**File:** `src/app/api/audit/scan/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { crawlWebsite } from "@/utils/crawler";
import { analyzeWebsite } from "@/utils/analyzeWebsite";
import type { AuditResult } from "@/types/audit";

// POST /api/audit/scan
export async function POST(req: NextRequest) {
  const supabase = createServerClient(/* config */);
  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId, siteUrl } = await req.json();

  // Validate URL
  try {
    new URL(siteUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  // Check user owns business
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  // Check for existing recent scan (cache)
  const { data: existingAudit } = await supabase
    .from("audits")
    .select("*")
    .eq("business_id", businessId)
    .gte("cache_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingAudit) {
    return NextResponse.json({ auditId: existingAudit.id });
  }

  // Create audit record with "scanning" status
  const auditId = crypto.randomUUID();
  const now = new Date();
  const cacheExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await supabase
    .from("audits")
    .insert({
      id: auditId,
      business_id: businessId,
      site_url: siteUrl,
      status: "scanning",
      scan_started_at: now.toISOString(),
      cache_expires_at: cacheExpiresAt.toISOString(),
    });

  // Kick off crawl + analysis in background (don't await)
  performAudit(auditId, businessId, siteUrl, supabase).catch((err) => {
    console.error(`Audit ${auditId} failed:`, err);
    supabase
      .from("audits")
      .update({
        status: "failed",
        error_message: err.message,
      })
      .eq("id", auditId);
  });

  return NextResponse.json({ auditId });
}

async function performAudit(
  auditId: string,
  businessId: string,
  siteUrl: string,
  supabase: any
) {
  const startTime = Date.now();

  // Crawl
  const { pages, hitLimit, durationMs } = await crawlWebsite({
    siteUrl,
    maxPages: 100,
    timeoutMs: 30000,
  });

  // Analyze
  const findings = analyzeWebsite(pages);

  // Store results
  await supabase
    .from("audits")
    .update({
      status: "completed",
      scan_completed_at: new Date().toISOString(),
      findings: findings,
      crawl_pages: pages.length,
      crawl_hit_limit: hitLimit,
      crawl_duration_ms: durationMs,
    })
    .eq("id", auditId);
}

// GET /api/audit/scan?auditId=...
export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("auditId");
  const supabase = createServerClient(/* config */);
  const { data: user } = await supabase.auth.getUser();

  if (!user || !auditId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: audit } = await supabase
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(audit);
}
```

---

### Step 5: Build the UI Components

**File:** `src/components/organisms/WebsitePreview.tsx`

```typescript
"use client";

interface WebsitePreviewProps {
  url: string;
}

export function WebsitePreview({ url }: WebsitePreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-[var(--color-fg-muted)]">
        Preview of {url}
      </div>
      <iframe
        src={url}
        title="Website preview"
        className="w-full h-[600px] border border-[var(--color-border)] rounded-[var(--radius-md)] bg-white"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        style={{
          // CSP: disallow third-party scripts
          // See global CSP header in layout.tsx
        }}
      />
      <div className="text-xs text-[var(--color-fg-muted)]">
        Preview may not load if site restricts embedding. This is a read-only
        preview for reference.
      </div>
    </div>
  );
}
```

**File:** `src/components/organisms/AuditFindings.tsx`

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { AuditFinding } from "@/types/audit";
import { cn } from "@/utils/cn";

interface AuditFindingsProps {
  findings: AuditFinding[];
  pagesCrawled: number;
  hitLimit: boolean;
}

export function AuditFindings({
  findings,
  pagesCrawled,
  hitLimit,
}: AuditFindingsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: "text-[#B54631]",
      bg: "bg-[#B54631]/10",
      badge: "bg-[#B54631]/20 text-[#8C3522]",
    },
    high: {
      icon: AlertCircle,
      color: "text-[#C97B45]",
      bg: "bg-[#C97B45]/10",
      badge: "bg-[#C97B45]/20 text-[#9A5D28]",
    },
    medium: {
      icon: Info,
      color: "text-[#6BA3F5]",
      bg: "bg-[#6BA3F5]/10",
      badge: "bg-[#6BA3F5]/20 text-[#2E6ACF]",
    },
    low: {
      icon: CheckCircle,
      color: "text-[#96A283]",
      bg: "bg-[#96A283]/10",
      badge: "bg-[#96A283]/20 text-[#566A47]",
    },
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="text-sm text-[var(--color-fg-muted)]">
        Scanned {pagesCrawled} page{pagesCrawled !== 1 ? "s" : ""}
        {hitLimit && " (capped at 100 pages)"}
      </div>

      {/* Findings grouped by severity */}
      {findings.length === 0 ? (
        <div className="text-center py-6 text-[var(--color-fg-muted)]">
          Great! No major issues found.
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((finding) => {
            const cfg = severityConfig[finding.severity];
            const Icon = cfg.icon;

            return (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden",
                  cfg.bg
                )}
              >
                <button
                  onClick={() =>
                    setExpandedId(
                      expandedId === finding.id ? null : finding.id
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
                >
                  <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-fg)]">
                      {finding.title}
                    </p>
                    <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                      Affects {finding.affectedPages} page
                      {finding.affectedPages !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-1 rounded-full",
                        cfg.badge
                      )}
                    >
                      {finding.estimatedFixTime}m
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[var(--color-fg-muted)] transition-transform",
                        expandedId === finding.id && "rotate-180"
                      )}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === finding.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)]">
                        <p className="text-sm text-[var(--color-fg-secondary)]">
                          {finding.description}
                        </p>
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-fg-muted)] mb-1">
                            How to fix
                          </p>
                          <p className="text-xs text-[var(--color-fg-muted)]">
                            {finding.recommendation}
                          </p>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div>
                            <p className="text-[var(--color-fg-muted)]">
                              Impact
                            </p>
                            <p className="font-semibold text-[var(--color-fg)]">
                              {finding.estimatedImpact}/10
                            </p>
                          </div>
                          <div>
                            <p className="text-[var(--color-fg-muted)]">
                              Time to fix
                            </p>
                            <p className="font-semibold text-[var(--color-fg)]">
                              ~{finding.estimatedFixTime}m
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**File:** `src/features/dashboard/pages/AuditPage.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { WebsitePreview } from "@/components/organisms/WebsitePreview";
import { AuditFindings } from "@/components/organisms/AuditFindings";
import { Card } from "@/components/atoms/Card";
import type { AuditResult } from "@/types/audit";

export function AuditPage({ businessId }: { businessId: string }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/audit/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, siteUrl }),
      });

      if (!res.ok) throw new Error("Scan failed");

      const { auditId } = await res.json();

      // Poll for results
      let polling = true;
      while (polling) {
        await new Promise((r) => setTimeout(r, 2000));
        const checkRes = await fetch(
          `/api/audit/scan?auditId=${auditId}`
        );
        const auditData = await checkRes.json();

        if (auditData.status === "completed") {
          setAudit(auditData);
          polling = false;
        } else if (auditData.status === "failed") {
          setError(auditData.error_message);
          polling = false;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-fg)]">
          Website Audit
        </h1>
        <p className="text-[var(--color-fg-secondary)] mt-2">
          Scan your website to see what helps (and hurts) your AI visibility.
        </p>
      </div>

      <Card>
        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-fg)] mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-fg)]"
            />
          </div>
          <Button type="submit" loading={loading}>
            {loading ? "Scanning..." : "Start Audit"}
          </Button>
          {error && (
            <p className="text-sm text-[#B54631]">{error}</p>
          )}
        </form>
      </Card>

      {audit && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WebsitePreview url={audit.site_url} />
          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-fg)] mb-4">
              Findings
            </h2>
            <AuditFindings
              findings={audit.findings}
              pagesCrawled={audit.crawl_pages}
              hitLimit={audit.crawl_hit_limit}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

### Step 6: Update CSP Headers for Iframe Sandboxing

**File:** `src/app/layout.tsx`

In the `<head>` section, add CSP header (or configure in `next.config.js`):

```typescript
// In the metadata object or response headers
const responseHeaders = new Headers();
responseHeaders.set(
  "Content-Security-Policy",
  [
    "default-src 'self';",
    "script-src 'self' 'unsafe-inline';", // Allow inline for Tailwind/Next.js
    "frame-src https:;", // Allow iframes from https sources only
    "connect-src 'self' https://supabase.co;",
    "img-src 'self' https: data:;",
    "style-src 'self' 'unsafe-inline';",
  ].join(" ")
);
```

---

### Step 7: Add Database Schema

Supabase migrations:

```sql
-- Create audits table
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scanning', 'completed', 'failed')),
  findings JSONB,
  crawl_pages INT,
  crawl_hit_limit BOOLEAN,
  crawl_duration_ms INT,
  error_message TEXT,
  scan_started_at TIMESTAMP NOT NULL,
  scan_completed_at TIMESTAMP,
  cache_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audits_business_expires ON audits(business_id, cache_expires_at);
```

---

## Testing Checklist

- [ ] Crawl a real site (acme-plumbing.com, example.com) — verify pages extracted correctly
- [ ] Crawl a large site (1000+ pages) — verify crawl stops at 100 pages and takes <30s
- [ ] Crawl a slow site — verify timeout stops crawl gracefully
- [ ] Audit a site with FAQ schema — verify finding NOT triggered
- [ ] Audit a site without FAQ schema — verify finding IS triggered
- [ ] Test on malicious URL (ethically) — verify no XSS, no request to attacker server
- [ ] Test cache — scan same site twice, verify second result returned from cache
- [ ] Load test with 10 concurrent scans — verify system doesn't crash

---

## Success Criteria

✅ Crawl completes in <30 seconds  
✅ Zero XSS vulnerabilities in preview  
✅ Audit findings are accurate (manual spot-check on 5 sites)  
✅ Users understand scope ("first 100 pages")  
✅ Cost per scan < $0.50  
✅ Cache reduces repeated scans by 80%+
