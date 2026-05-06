"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
import { GapPlaybookModal, type GapPlaybook } from "@/components/molecules/GapPlaybookModal";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/atoms/Card";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";
import type { SentimentDataPoint } from "@/features/sentiment/hooks/useSentimentHistory";

interface Props {
  results: ScanResult[];
  history: SentimentDataPoint[];
  businessName: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Verdict thresholds — sensitivity rule (Joey 2026-05-05): "Concerning"
// requires a meaningful negative presence. A pos/neutral mix with zero
// negatives can never be Concerning, no matter how low the positive %
// is — that's just Mixed. Negative ≥ 20% (or negative > positive when
// positive is also low) tips the verdict into Concerning.
function statusFromBreakdown(
  positivePct: number,
  negativePct: number,
): { word: string; color: string } {
  if (negativePct >= 20 || (negativePct > positivePct && negativePct > 0)) {
    return { word: "concerning", color: SURVEN_SEMANTIC.bad };
  }
  if (positivePct >= 70 && negativePct <= 10) {
    return { word: "strong", color: SURVEN_SEMANTIC.good };
  }
  return { word: "mixed", color: SURVEN_SEMANTIC.mid };
}

export function SentimentHero({ results, history, businessName }: Props) {
  const data = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of mentioned) {
      if (r.sentiment) counts[r.sentiment as keyof typeof counts]++;
    }
    const positivePct = total > 0 ? Math.round((counts.positive / total) * 100) : 0;
    const negativePctRaw =
      total > 0 ? Math.round((counts.negative / total) * 100) : 0;

    // Trend delta from history
    const delta = history.length >= 2
      ? history[history.length - 1].positivePct - history[history.length - 2].positivePct
      : null;

    // Top negative-driving prompts (deduped) + which engines flagged them
    const negativeMap = new Map<string, { prompt: string; engines: Set<ModelName>; }>();
    for (const r of mentioned) {
      if (r.sentiment !== "negative") continue;
      const key = r.prompt_text.slice(0, 80);
      if (!negativeMap.has(key)) {
        negativeMap.set(key, { prompt: r.prompt_text, engines: new Set() });
      }
      negativeMap.get(key)!.engines.add(r.model_name as ModelName);
    }
    const issues = Array.from(negativeMap.values())
      .sort((a, b) => b.engines.size - a.engines.size)
      .slice(0, 3);

    return { total, counts, positivePct, negativePct: negativePctRaw, delta, issues };
  }, [results, history]);

  if (data.total === 0) return null;

  const status = statusFromBreakdown(data.positivePct, data.negativePct);
  const ringRadius = 56;
  const ringStroke = 14;
  const circumference = 2 * Math.PI * ringRadius;

  // Per-sentiment percentages from the latest scan (rounded so they sum to
  // ~100 modulo rounding). Each becomes its own animated arc segment.
  const positivePct = data.positivePct;
  const neutralPct =
    data.total > 0 ? Math.round((data.counts.neutral / data.total) * 100) : 0;
  const negativePct = Math.max(0, 100 - positivePct - neutralPct);

  // Period-over-period delta per series, computed from history (latest vs
  // previous data point). Null when fewer than 2 scans are available.
  const lastPoint = history[history.length - 1];
  const prevPoint = history[history.length - 2];
  const positiveDelta =
    lastPoint && prevPoint ? lastPoint.positivePct - prevPoint.positivePct : null;
  const neutralDelta =
    lastPoint && prevPoint ? lastPoint.neutralPct - prevPoint.neutralPct : null;
  const negativeDelta =
    lastPoint && prevPoint ? lastPoint.negativePct - prevPoint.negativePct : null;

  // Multi-series chart data — all three sentiment buckets so the user sees
  // not just whether positive went up, but whether the lift came from
  // neutrals or whether negatives also fell.
  const chartData = history.map((d) => ({
    date: formatDate(d.date),
    positive: d.positivePct,
    neutral: d.neutralPct,
    negative: d.negativePct,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT — Sentiment ring */}
      <Card className="lg:col-span-3 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3
            style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}
          >
            Sentiment
          </h3>
          <span
            className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap capitalize"
            style={{
              color: status.color,
              backgroundColor: `${status.color}1F`,
            }}
            title={`Overall sentiment verdict: ${status.word}.`}
          >
            {status.word}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
          <div className="relative" style={{ width: 160, height: 160 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                stroke="var(--color-surface-alt)"
                strokeWidth={ringStroke}
              />
              {/* Three stacked arcs — positive (sage), neutral (warm grey),
                  negative (rust). Each is rotated to its starting angle and
                  staggers in via a strokeDashoffset transition with delay. */}
              <SentimentArc
                center={80}
                radius={ringRadius}
                stroke={ringStroke}
                circumference={circumference}
                color={SURVEN_SEMANTIC.good}
                pct={positivePct}
                startPct={0}
                delaySec={0}
              />
              <SentimentArc
                center={80}
                radius={ringRadius}
                stroke={ringStroke}
                circumference={circumference}
                color={SURVEN_SEMANTIC.neutral}
                pct={neutralPct}
                startPct={positivePct}
                delaySec={0.45}
              />
              <SentimentArc
                center={80}
                radius={ringRadius}
                stroke={ringStroke}
                circumference={circumference}
                color={SURVEN_SEMANTIC.bad}
                pct={negativePct}
                startPct={positivePct + neutralPct}
                delaySec={0.9}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 38,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: "var(--color-fg)",
                }}
              >
                {positivePct}%
              </span>
              <span className="text-[11px] text-[var(--color-fg-muted)] mt-1 uppercase tracking-wide">
                Positive
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
            <SentimentRow
              color={SURVEN_SEMANTIC.good}
              label="Positive"
              count={data.counts.positive}
              pct={positivePct}
              delta={positiveDelta}
              invert={false}
            />
            <SentimentRow
              color={SURVEN_SEMANTIC.neutral}
              label="Neutral"
              count={data.counts.neutral}
              pct={neutralPct}
              delta={neutralDelta}
              invert={false}
              alwaysNeutral
            />
            <SentimentRow
              color={SURVEN_SEMANTIC.bad}
              label="Negative"
              count={data.counts.negative}
              pct={negativePct}
              delta={negativeDelta}
              invert
            />
          </div>
        </div>
      </Card>

      {/* CENTER — Trend chart */}
      <Card className="lg:col-span-6 flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3
            style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}
          >
            Sentiment over time
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            {/* Three-series legend — same compact pattern as the AI Visibility
                "over time" chart (color dot + tiny label per series). */}
            <div className="flex items-center gap-2.5 text-[10.5px] text-[var(--color-fg-muted)]">
              <span className="inline-flex items-center gap-1">
                <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: SURVEN_SEMANTIC.good }} />
                Positive
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: SURVEN_SEMANTIC.neutral }} />
                Neutral
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: SURVEN_SEMANTIC.bad }} />
                Negative
              </span>
            </div>
            <span className="text-xs text-[var(--color-fg-muted)]">
              {history.length} scan{history.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-[180px]">
          {chartData.length < 2 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-[var(--color-fg-muted)]">Run more scans to see the trend.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                {/* Horizontal grid lines — same dashed styling + stroke
                    treatment as the AI Visibility "over time" chart so the
                    two graphs read as a matched set. */}
                <CartesianGrid
                  strokeDasharray="3 4"
                  stroke="rgba(60,62,60,0.35)"
                  strokeOpacity={1}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  // Tooltip follows the cursor (default Recharts behavior).
                  // wrapperStyle z-index + allowEscapeViewBox keep the box
                  // on the top layer and let it overflow the chart bounds
                  // near edges so it never gets clipped.
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 50 }}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "var(--color-fg)",
                  }}
                  formatter={(value, name) => [`${Number(value)}%`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                />
                <Line
                  type="monotone"
                  dataKey="positive"
                  stroke={SURVEN_SEMANTIC.good}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="neutral"
                  stroke={SURVEN_SEMANTIC.neutral}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="negative"
                  stroke={SURVEN_SEMANTIC.bad}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* RIGHT — What needs attention (matches GapsToFillCard pattern) */}
      <SentimentAttentionCard issues={data.issues.slice(0, 3)} totalMentions={data.total} />
    </div>
  );
}

// ─── "What needs attention" card — visually mirrors GapsToFillCard on
// the AI Visibility Tracker hero. Rust top border, gradient red banner
// header, AlertTriangle next to the title, count pill, up to 3 sub-cards
// each with a rust icon tile + body + CTA, and a sage "all clear"
// empty state when there are no negative-sentiment issues.
function SentimentAttentionCard({
  issues,
  totalMentions,
}: {
  issues: { prompt: string; engines: Set<ModelName> }[];
  totalMentions: number;
}) {
  const RUST = SURVEN_SEMANTIC.bad;
  const RUST_BG = "rgba(181,70,49,0.12)";
  const [activePlaybook, setActivePlaybook] = useState<GapPlaybook | null>(
    null,
  );

  // Build a per-issue playbook describing the framing problem + the fix.
  function buildIssuePlaybook(issue: {
    prompt: string;
    engines: Set<ModelName>;
  }): GapPlaybook {
    const engineLabels = Array.from(issue.engines)
      .map((e) =>
        e === "chatgpt"
          ? "ChatGPT"
          : e === "claude"
            ? "Claude"
            : e === "gemini"
              ? "Gemini"
              : "Google AI",
      )
      .join(", ");
    return {
      title: "Negative framing flagged on this prompt",
      body: `${engineLabels} ${issue.engines.size === 1 ? "is" : "are"} returning critical language when answering:\n\n"${issue.prompt}"\n\nThe fix is almost always at the source — a Reddit thread, old review, or outdated forum post is shaping the verdict.\n\nFix path:\n\n• Reply publicly on the source platform, refresh the cited content with stronger counter-evidence, or request an author correction.\n\n• New positive sources within 30-90 days usually flip the framing.`,
      managedPlansCopy: `handle the source rewrites, review-platform outreach, and reputation-correcting content for you.`,
    };
  }
  return (
    <div
      className="lg:col-span-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full"
      style={{ borderTop: `4px solid ${RUST}` }}
    >
      {/* Red banner strip — same treatment as GapsToFillCard. Top corners
          rounded inline so the parent doesn't need overflow:hidden, which
          was clipping the SectionHeading info-icon popover. */}
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(181,70,49,0.18) 0%, rgba(181,70,49,0.04) 100%)",
          borderTopLeftRadius: "calc(var(--radius-lg) - 4px)",
          borderTopRightRadius: "calc(var(--radius-lg) - 4px)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: RUST }} />
          <SectionHeading
            text="What needs attention"
            info="Negative-sentiment prompts flagged this scan, ranked by how many engines they're surfacing on. Each links to the audit that addresses the framing."
          />
        </div>
        <div className="shrink-0">
          <span
            className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
            style={{ color: RUST, backgroundColor: RUST_BG }}
          >
            {issues.length} {issues.length === 1 ? "issue" : "issues"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 p-5">
        {issues.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4 py-6">
            <div className="flex flex-col items-center gap-3 max-w-[240px]">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(150,162,131,0.20)" }}
              >
                <Sparkles
                  className="h-5 w-5"
                  style={{ color: SURVEN_SEMANTIC.goodAlt }}
                />
              </div>
              <p
                className="font-semibold"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.3,
                  color: "var(--color-fg)",
                }}
              >
                Nothing flagged — sentiment is clean
              </p>
              <p
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 12, lineHeight: 1.5 }}
              >
                No negative signals across {totalMentions} mentions this scan.
                Defend it by keeping fresh testimonials and case studies in
                your cited sources.
              </p>
            </div>
          </div>
        ) : (
          issues.map((issue, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivePlaybook(buildIssuePlaybook(issue))}
              className="text-left rounded-[var(--radius-md)] border border-[var(--color-border)] p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors hover:border-[rgba(181,70,49,0.45)]"
              style={{ background: "var(--color-surface-alt)" }}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: RUST_BG }}
              >
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: RUST }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[var(--color-fg)] font-semibold line-clamp-2"
                  style={{ fontSize: 12.5, lineHeight: 1.3 }}
                >
                  &ldquo;{issue.prompt.length > 70 ? issue.prompt.slice(0, 70) + "…" : issue.prompt}&rdquo;
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from(issue.engines).slice(0, 4).map((e) => (
                    <EngineIcon key={e} id={e} size={11} />
                  ))}
                  <span
                    className="text-[var(--color-fg-muted)] ml-1"
                    style={{ fontSize: 10.5 }}
                  >
                    {issue.engines.size} engine{issue.engines.size !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 mt-1 shrink-0"
                style={{ color: RUST }}
              />
            </button>
          ))
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

// ─── Animated arc segment (used by the 3-segment sentiment donut) ──────────
// Renders one slice of the donut, rotated to its starting angle. The arc
// reveals via a strokeDashoffset transition with a per-segment delay so
// positive draws first, then neutral, then negative.

function SentimentArc({
  center,
  radius,
  stroke,
  circumference,
  color,
  pct,
  startPct,
  delaySec,
}: {
  center: number;
  radius: number;
  stroke: number;
  circumference: number;
  color: string;
  pct: number;
  startPct: number;
  delaySec: number;
}) {
  // Start hidden (offset = full arc length), then animate to visible.
  const arcLength = (pct / 100) * circumference;
  const [offset, setOffset] = useState(arcLength);
  useEffect(() => {
    // Defer one frame so the initial paint registers the hidden state
    // before transitioning to the target offset.
    const id = requestAnimationFrame(() => setOffset(0));
    return () => cancelAnimationFrame(id);
  }, [arcLength]);

  if (pct <= 0) return null;
  // Each arc starts at -90° (12 o'clock) plus its slice offset around the
  // ring. SVG rotates clockwise, so multiplying startPct/100 * 360 walks
  // the start angle forward through positive → neutral → negative.
  const rotation = -90 + (startPct / 100) * 360;
  return (
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="butt"
      strokeDasharray={`${arcLength} ${circumference}`}
      strokeDashoffset={offset}
      transform={`rotate(${rotation} ${center} ${center})`}
      style={{
        transition: `stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1) ${delaySec}s`,
      }}
    />
  );
}

// ─── One row of the per-sentiment count + delta breakdown ──────────────────
// Lives under the donut. The pill semantics are inverted for "Negative" so
// that a downward move (less negative sentiment) reads as good (sage), not
// bad. Neutral row pins the pill to "neutral" tone since neither direction
// is inherently good or bad.

function SentimentRow({
  color,
  label,
  count,
  pct,
  delta,
  invert,
  alwaysNeutral = false,
}: {
  color: string;
  label: string;
  count: number;
  pct: number;
  delta: number | null;
  invert: boolean;
  alwaysNeutral?: boolean;
}) {
  let deltaType: "increase" | "decrease" | "neutral" = "neutral";
  if (alwaysNeutral || delta == null || Math.abs(delta) < 0.5) {
    deltaType = "neutral";
  } else {
    const isUp = delta > 0;
    if (invert) {
      deltaType = isUp ? "decrease" : "increase";
    } else {
      deltaType = isUp ? "increase" : "decrease";
    }
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="rounded-full shrink-0"
          style={{ width: 8, height: 8, backgroundColor: color }}
        />
        <span
          className="text-[var(--color-fg-secondary)] truncate"
          style={{ fontSize: 11 }}
        >
          <span className="font-semibold text-[var(--color-fg)]">{count}</span>{" "}
          {label.toLowerCase()} · {pct}%
        </span>
      </div>
      {delta != null && (
        <div className="shrink-0">
          <BadgeDelta
            variant="solid"
            deltaType={deltaType}
            value={`${delta > 0 ? "+" : ""}${delta}%`}
            title={`${label} sentiment changed ${delta > 0 ? "+" : ""}${delta}% vs. the previous scan.`}
          />
        </div>
      )}
    </div>
  );
}
