"use client";

/**
 * Citation Gap Analysis — two side-by-side cards (Citation wins to
 * defend + Citation gaps to claim) that mirror the PromptThemesCard
 * chrome from /prompts: 4px borderTop accent, gradient banner header
 * with HeaderIcon + SectionHeading + count pill, click-through rows
 * that open the GapPlaybookModal with a domain-specific recipe.
 *
 * Same data as before — top cited domains split by whether they
 * appeared in a response that also named the business — but rendered
 * as the canonical "wins / gaps" pair so the visual pattern matches
 * the prompts page exactly.
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { GapPlaybookModal, type GapPlaybook } from "@/components/molecules/GapPlaybookModal";
import {
  AUTHORITY_LABEL,
  getAuthority,
  type AuthorityTier,
} from "@/utils/citationAuthority";
import type { ScanResult } from "@/types/database";

interface CitationGapSectionProps {
  results: ScanResult[];
  businessName: string;
}

interface DomainStat {
  domain: string;
  count: number;
  models: string[];
  mentionedWithBusiness: boolean;
  authority: AuthorityTier;
}

const RUST = "#B54631";
const RUST_BG = "rgba(181,70,49,0.12)";
const SAGE = "#5E7250";
const SAGE_BG = "rgba(150,162,131,0.18)";

export function CitationGapSection({
  results,
  businessName,
}: CitationGapSectionProps) {
  const { gaps, listed, totalGaps, totalListed } = useMemo(() => {
    const map = new Map<
      string,
      { count: number; models: Set<string>; mentionedWithBusiness: boolean }
    >();
    for (const r of results) {
      if (!r.citations || r.citations.length === 0) continue;
      for (const domain of r.citations) {
        const existing = map.get(domain) ?? {
          count: 0,
          models: new Set<string>(),
          mentionedWithBusiness: false,
        };
        existing.count++;
        existing.models.add(r.model_name);
        if (r.business_mentioned) existing.mentionedWithBusiness = true;
        map.set(domain, existing);
      }
    }
    const all: DomainStat[] = Array.from(map.entries()).map(
      ([domain, { count, models, mentionedWithBusiness }]) => ({
        domain,
        count,
        models: Array.from(models),
        mentionedWithBusiness,
        authority: getAuthority(domain),
      }),
    );
    // Gap rows surface highest-authority first (those are the
    // highest-leverage missing listings); Listed rows surface highest
    // raw count first (most-cited domains that already feature the
    // business are the strongest signals to defend).
    const AUTH_RANK = { high: 0, medium: 1, low: 2 } as const;
    const gapsAll = all
      .filter((d) => !d.mentionedWithBusiness)
      .sort(
        (a, b) =>
          AUTH_RANK[a.authority] - AUTH_RANK[b.authority] || b.count - a.count,
      );
    const listedAll = all
      .filter((d) => d.mentionedWithBusiness)
      .sort((a, b) => b.count - a.count);
    return {
      gaps: gapsAll,
      listed: listedAll,
      totalGaps: gapsAll.length,
      totalListed: listedAll.length,
    };
  }, [results]);

  if (gaps.length === 0 && listed.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <CitationDomainsCard
        variant="wins"
        title="Citation wins to defend"
        info={`Domains AI cites in answers that also name ${businessName}. These are your strongest source moats — keep them fresh, since AI weights recently updated sources higher. Tap any row for the playbook.`}
        domains={listed}
        totalCount={totalListed}
        businessName={businessName}
      />
      <CitationDomainsCard
        variant="gaps"
        title="Citation gaps to claim"
        info={`Domains AI cites when answering about your category — but ${businessName} is nowhere on them. Highest-authority gaps surface first. Tap any row for the playbook.`}
        domains={gaps}
        totalCount={totalGaps}
        businessName={businessName}
      />
    </div>
  );
}

// Mirrors the canonical PromptThemesCard chrome on /prompts (4px
// borderTop accent + gradient banner + count pill + compact accent-tile
// rows + click-through GapPlaybookModal). Only the data shape and the
// vocabulary change (citation-themed instead of prompt-themed).
function CitationDomainsCard({
  variant,
  title,
  info,
  domains,
  totalCount,
  businessName,
}: {
  variant: "wins" | "gaps";
  title: string;
  info: string;
  domains: DomainStat[];
  totalCount: number;
  businessName: string;
}) {
  const accent = variant === "wins" ? SAGE : RUST;
  const accentBg = variant === "wins" ? SAGE_BG : RUST_BG;
  const HeaderIcon = variant === "wins" ? Trophy : AlertTriangle;
  const headerGradient =
    variant === "wins"
      ? "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.04) 100%)"
      : "linear-gradient(135deg, rgba(181,70,49,0.18) 0%, rgba(181,70,49,0.04) 100%)";
  const countLabel =
    variant === "wins"
      ? `${totalCount} ${totalCount === 1 ? "win" : "wins"}`
      : `${totalCount} ${totalCount === 1 ? "gap" : "gaps"}`;

  // Cap at 3 to match the canonical chrome — same slice
  // PromptThemesCard does on /prompts.
  const visible = domains.slice(0, 3);
  const [activePlaybook, setActivePlaybook] = useState<GapPlaybook | null>(null);

  function buildPlaybook(d: DomainStat): GapPlaybook {
    const authLabel = AUTHORITY_LABEL[d.authority].toLowerCase();
    const enginesPhrase = `${d.models.length} of 4 engine${d.models.length === 1 ? "" : "s"}`;
    if (variant === "gaps") {
      const fix =
        d.authority === "high"
          ? `Get listed on ${d.domain} as a priority — it's a high-authority source AI already trusts. Most directories take a free listing in under 10 minutes; some (BBB, Yelp, Google Business) need a verification step but pay back the highest weight in AI answers. Once listed, push fresh review/photo activity for the first 30 days so the listing is "active" when AI re-crawls.`
          : d.authority === "medium"
            ? `Claim a listing on ${d.domain}. AI is already pulling from there for your category, so showing up converts that pull into a citation for ${businessName}. Mid-tier directories don't carry as much weight as the heavy hitters, but they compound — every additional source AI sees you on raises your odds of being named.`
            : `Lower-authority source, but worth claiming since AI already references it for your category. If ${d.domain} accepts a free listing, take 5 minutes to claim it — easy wins compound. If it requires paid placement, deprioritize until the higher-authority gaps above are closed.`;
      return {
        title: d.domain,
        body: (
          <div className="space-y-3">
            <p>
              AI cited <strong>{d.domain}</strong> {d.count} time{d.count === 1 ? "" : "s"} across{" "}
              {enginesPhrase} when answering questions about {businessName}'s
              category — but {businessName} was never named in any of those
              responses. That's {authLabel}-authority signal AI is using to
              describe your space without crediting you.
            </p>
            <div>
              <p
                className="text-[var(--color-fg)] font-semibold mb-1"
                style={{ fontSize: 13 }}
              >
                How to fix
              </p>
              <p>{fix}</p>
            </div>
          </div>
        ),
        actionCta: {
          label: "Open Website Audit to claim this listing",
          href: "/audit#fix-these-first",
        },
        tone: "rust",
        managedPlansCopy:
          "claim the directory listings, build the citation profile, and run the outreach so AI starts seeing you on the sources it trusts most.",
      };
    }
    // Wins variant — defend playbook
    const defendTip =
      d.authority === "high"
        ? `${d.domain} is a high-authority source — these are the sources AI weights heaviest in answers. Audit your listing once a quarter: confirm name/address/phone match exactly across all your listings, refresh photos every 60–90 days, and keep new reviews flowing so the listing stays "active" in AI's freshness signals.`
        : d.authority === "medium"
          ? `${d.domain} is mid-tier authority. Keep the listing fresh — outdated info on mid-tier sources gets de-weighted faster than on heavyweight directories. A monthly check + refresh of photos / hours / service descriptions keeps this contributing.`
          : `Lower-authority source, but it's still pulling weight in answers about ${businessName}. Don't spend cycles optimizing it — just confirm the listing is accurate so it doesn't actively misinform AI.`;
    return {
      title: d.domain,
      body: (
        <div className="space-y-3">
          <p>
            <strong>{d.domain}</strong> cites <strong>{businessName}</strong>{" "}
            {d.count} time{d.count === 1 ? "" : "s"} across {enginesPhrase} —
            this is one of your strongest source moats. {authLabel === "high" ? "AI weights this domain heavily, so every fresh signal here compounds." : authLabel === "medium" ? "It's pulling consistent weight in your category answers." : "It's contributing to your AI mention count — keep it warm."}
          </p>
          <div>
            <p
              className="text-[var(--color-fg)] font-semibold mb-1"
              style={{ fontSize: 13 }}
            >
              How to defend it
            </p>
            <p>{defendTip}</p>
          </div>
        </div>
      ),
      actionCta: {
        label: "Open Website Audit to defend this source",
        href: "/audit",
      },
      tone: "sage",
      managedPlansCopy:
        "monitor your top citation sources monthly, push fresh signals (reviews, photos, content updates), and replicate the pattern across your weaker placements.",
    };
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full w-full min-w-0"
      style={{ borderTop: `4px solid ${accent}` }}
    >
      {/* Banner header — same gradient + rounded corners pattern as
          PromptThemesCard so the two pages read as a matched set. */}
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2"
        style={{
          background: headerGradient,
          borderTopLeftRadius: "calc(var(--radius-lg) - 4px)",
          borderTopRightRadius: "calc(var(--radius-lg) - 4px)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <HeaderIcon className="h-4 w-4 shrink-0" style={{ color: accent }} />
          <SectionHeading text={title} info={info} />
        </div>
        <div className="shrink-0">
          <span
            className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
            style={{ color: accent, backgroundColor: accentBg }}
          >
            {countLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 p-5">
        {visible.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4 py-6">
            <div className="flex flex-col items-center gap-3 max-w-[260px]">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accentBg }}
              >
                <Sparkles className="h-5 w-5" style={{ color: accent }} />
              </div>
              <p
                className="font-semibold"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.3,
                  color: "var(--color-fg)",
                }}
              >
                {variant === "wins"
                  ? "No source moats yet"
                  : "No gaps flagged this scan"}
              </p>
              <p
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 12, lineHeight: 1.5 }}
              >
                {variant === "wins"
                  ? `No domains are featuring ${businessName} yet — claim the gap listings to start building source moats.`
                  : `Every cited domain in this scan also names ${businessName}. Defend the wins on the left to keep it that way.`}
              </p>
            </div>
          </div>
        ) : (
          visible.map((d, i) => (
            <button
              key={d.domain + i}
              type="button"
              onClick={() => setActivePlaybook(buildPlaybook(d))}
              className="text-left rounded-[var(--radius-md)] border border-[var(--color-border)] p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors"
              style={{ background: "var(--color-surface-alt)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${accent}73`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: accentBg }}
              >
                <HeaderIcon className="h-3.5 w-3.5" style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[var(--color-fg)] font-semibold truncate"
                  style={{ fontSize: 12.5, lineHeight: 1.25 }}
                >
                  {d.domain}
                </p>
                <p
                  className="text-[var(--color-fg-secondary)] mt-0.5"
                  style={{ fontSize: 11.5, lineHeight: 1.4 }}
                >
                  {variant === "wins"
                    ? `Cites ${businessName} ${d.count} time${d.count === 1 ? "" : "s"} across ${d.models.length} engine${d.models.length === 1 ? "" : "s"} · ${AUTHORITY_LABEL[d.authority].toLowerCase()} authority`
                    : `AI cites this ${d.count} time${d.count === 1 ? "" : "s"} across ${d.models.length} engine${d.models.length === 1 ? "" : "s"} but never names ${businessName} · ${AUTHORITY_LABEL[d.authority].toLowerCase()} authority`}
                </p>
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 mt-1 shrink-0"
                style={{ color: accent }}
              />
            </button>
          ))
        )}
        {visible.length > 0 && (
          <p
            className="text-[var(--color-fg-secondary)] text-center mt-1 italic font-semibold"
            style={{ fontSize: 12.5, lineHeight: 1.4 }}
          >
            {variant === "wins"
              ? "Click any row to see how to defend it"
              : "Click any row to see how to fix it"}
          </p>
        )}
      </div>
      <GapPlaybookModal
        open={activePlaybook != null}
        onClose={() => setActivePlaybook(null)}
        playbook={activePlaybook}
      />
    </div>
  );
}
