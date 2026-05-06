"use client";

import * as React from "react";
import {
  Trophy,
  Target as TargetIcon,
  Layers,
  MessageSquare,
  Crown,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { HoverHint } from "@/components/atoms/HoverHint";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";

type Tier = { label: string; color: string; description: string };

const tierFor = (s: number): Tier =>
  s < 31
    ? { label: "Low", color: "#B54631", description: "AI tools rarely mention you. Biggest growth lever sits here." }
    : s < 61
    ? { label: "Fair", color: "#C97B45", description: "You show up sometimes — plenty of room to climb." }
    : s < 86
    ? { label: "Strong", color: "#96A283", description: "Showing up steadily across most AI tools." }
    : { label: "Excellent", color: "#7D8E6C", description: "You're top-of-mind in AI answers — protect this position." };

const polar = (cx: number, cy: number, r: number, deg: number) => ({
  x: cx - r * Math.cos((deg * Math.PI) / 180),
  y: cy - r * Math.sin((deg * Math.PI) / 180),
});

const arc = (cx: number, cy: number, r: number, a: number, b: number) => {
  const s = polar(cx, cy, r, a);
  const e = polar(cx, cy, r, b);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};

export interface VisibilityStats {
  promptsHit: number;
  promptsTotal: number;
  delta: number;
  bestEngine: { label: string; pct: number };
  weakEngine: { label: string; pct: number };
  coverageEngines: number;
  totalEngines: number;
  avgRank: number;
  rankedTotal: number;
  mentions: number;
}

const ACCENTS = {
  sage: "#96A283",
  yellow: "#B8A030",
  orange: "#C97B45",
  rust: "#B54631",
  deep: "#7D8E6C",
};

function StatsBlock({ stats }: { stats: VisibilityStats }) {
  const grew = stats.delta >= 0;
  const pct = Math.round((stats.promptsHit / Math.max(1, stats.promptsTotal)) * 100);
  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--radius-md)] p-4 border-l-4"
        style={{
          borderLeftColor: ACCENTS.sage,
          background: `linear-gradient(135deg, ${ACCENTS.sage}1F 0%, ${ACCENTS.yellow}10 100%)`,
        }}
      >
        <div className="flex items-baseline justify-between mb-1 gap-2">
          <HoverHint hint="Customer-style prompts where AI tools named your business in the most recent scan.">
            <span
              className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
              style={{ fontSize: 10, letterSpacing: "0.1em", cursor: "help" }}
            >
              Prompt hit rate
            </span>
          </HoverHint>
          <HoverHint hint="Change in your visibility vs. the start of the range.">
            <span
              className="tabular-nums font-bold rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5"
              style={{
                fontSize: 10,
                color: "#fff",
                backgroundColor: grew ? ACCENTS.sage : ACCENTS.rust,
                cursor: "help",
              }}
            >
              {grew ? "↑" : "↓"} {Math.abs(stats.delta).toFixed(1)}%
            </span>
          </HoverHint>
        </div>
        <HoverHint
          hint={`You appeared in ${stats.promptsHit} of ${stats.promptsTotal} prompts.`}
          display="block"
        >
          <div className="flex items-baseline gap-1" style={{ cursor: "help" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                fontWeight: 700,
                color: "var(--color-fg)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {stats.promptsHit}
            </span>
            <span
              style={{ fontSize: 15, color: "var(--color-fg-muted)", fontWeight: 500 }}
            >
              /{stats.promptsTotal}
            </span>
            <span
              className="ml-auto tabular-nums"
              style={{
                fontSize: 11,
                color: "var(--color-fg-muted)",
                alignSelf: "flex-end",
              }}
            >
              {pct}%
            </span>
          </div>
        </HoverHint>
        <a
          href="/pricing"
          className="inline-flex items-center gap-1 font-semibold hover:gap-1.5 hover:underline transition-all mt-2"
          style={{ fontSize: 11, color: ACCENTS.orange }}
        >
          <Crown className="h-3 w-3" />
          Upgrade to track more prompts
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Chip
          color={ACCENTS.yellow}
          icon={Trophy}
          label={`${stats.bestEngine.label} ${stats.bestEngine.pct.toFixed(0)}%`}
          hint={`Top engine: ${stats.bestEngine.label} mentions you in ${stats.bestEngine.pct.toFixed(0)}% of its answers.`}
        />
        <Chip
          color={ACCENTS.orange}
          icon={TargetIcon}
          label={`#${stats.avgRank.toFixed(1)} rank`}
          hint="Your average rank among tracked brands when AI mentions someone. Lower is better — rank 1 means you're cited first."
        />
        <Chip
          color={ACCENTS.sage}
          icon={Layers}
          label={`${stats.coverageEngines}/${stats.totalEngines} engines`}
          hint="Engines that have mentioned you at least once."
        />
        <Chip
          color={ACCENTS.deep}
          icon={MessageSquare}
          label={`${stats.mentions.toLocaleString()} mentions`}
          hint="Total mentions across every AI tool in this scan."
        />
      </div>
    </div>
  );
}

function Chip({
  color,
  icon: Icon,
  label,
  hint,
}: {
  color: string;
  icon: typeof Trophy;
  label: string;
  hint: string;
}) {
  return (
    <HoverHint hint={hint} display="block">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 w-full justify-center"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: color,
          backgroundColor: `${color}1A`,
          border: `1px solid ${color}33`,
          cursor: "help",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    </HoverHint>
  );
}

export function VisibilityScoreGauge({
  score = 50,
  label = "AI Visibility",
  width,
  descriptionOverride,
  stats,
  hideDescription = false,
  delta,
}: {
  score?: number | null;
  label?: string;
  width?: number;
  descriptionOverride?: React.ReactNode;
  stats?: VisibilityStats;
  /** When true, suppresses the bottom tier-description callout. Used by
   *  the AI Visibility Tracker hero where the gauge card needs to be
   *  short enough to match the other two cards in the 3-zone grid. */
  hideDescription?: boolean;
  /** Period-over-period delta (in % points). Shown as a top-right pill,
   *  matching the convention used by other dashboard cards (Brand
   *  Sentiment, leaderboard, etc.). */
  delta?: number;
}) {
  const hasScore = score !== null && score !== undefined;
  const safeScore = hasScore ? (score as number) : 0;
  const t = hasScore
    ? tierFor(safeScore)
    : {
        label: "No data yet",
        color: "#A09890",
        description: "Run your first scan to see how often AI tools mention your business.",
      };
  const cx = 130, cy = 120, r = 88, stroke = 20;
  const angle = Math.max(2, Math.min(180, (safeScore / 100) * 180));
  const tip = polar(cx, cy, r, angle);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full w-full"
      style={width != null ? { width } : undefined}
    >
      <div className="mb-4 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading
          text={label}
          info="How often AI tools mention your business across customer questions."
        />
        {delta != null && (
          <div className="shrink-0">
            <BadgeDelta
              variant="solid"
              deltaType={
                Math.abs(delta) <= 0.04
                  ? "neutral"
                  : delta > 0
                    ? "increase"
                    : "decrease"
              }
              value={`${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
              title={
                Math.abs(delta) <= 0.04
                  ? "No change in your visibility over the selected range."
                  : `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta).toFixed(1)}% over the selected range.`
              }
            />
          </div>
        )}
      </div>
      {descriptionOverride && <div className="mb-4">{descriptionOverride}</div>}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex justify-center w-full">
          <div className="relative" style={{ width: "100%" }}>
        <svg viewBox="0 0 260 150" width="100%" style={{ display: "block" }}>
          <defs>
            <linearGradient id="vsgTrack" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#B54631" stopOpacity="0.32" />
              <stop offset="33%" stopColor="#C97B45" stopOpacity="0.38" />
              <stop offset="66%" stopColor="#96A283" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7D8E6C" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path d={arc(cx, cy, r, 0, 180)} stroke="url(#vsgTrack)" strokeWidth={stroke} fill="none" strokeLinecap="round" />
          {hasScore && (
            <>
              <path d={arc(cx, cy, r, 0, angle)} stroke={t.color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
              <polygon
                points={`${tip.x},${tip.y - 14} ${tip.x - 6},${tip.y - 4} ${tip.x + 6},${tip.y - 4}`}
                fill={t.color}
                transform={`rotate(${angle - 90} ${tip.x} ${tip.y - 4})`}
              />
            </>
          )}
          <text
            x={cx}
            y={cy - 16}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: hasScore ? 52 : 44,
              fontWeight: 600,
              fill: t.color,
              letterSpacing: "-0.02em",
            }}
          >
            {hasScore ? `${Math.round(safeScore)}%` : "—"}
          </text>
          {hasScore && (
            <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--color-fg-muted)" fontSize="13">
              /100%
            </text>
          )}
          <text
            x={cx}
            y={cy + 26}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-display)", fontSize: hasScore ? 28 : 20, fontWeight: 500, fill: "var(--color-fg)" }}
          >
            {t.label}
          </text>
        </svg>
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "61%",
            transform: "translate(-50%, -50%)",
            width: "44%",
            height: "32%",
          }}
        >
          <HoverHint
            hint="Your AI Visibility Score (0–100%) — share of prompts where AI tools mentioned you."
            display="block"
            className="w-full h-full"
          >
            <div className="w-full h-full" style={{ cursor: "help" }} />
          </HoverHint>
        </div>
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "78%",
            transform: "translate(-50%, -50%)",
            width: "40%",
            height: "20%",
          }}
        >
          <HoverHint
            hint={`${t.label}: ${t.description}`}
            display="block"
            className="w-full h-full"
          >
            <div className="w-full h-full" style={{ cursor: "help" }} />
          </HoverHint>
        </div>
      </div>
        </div>
      </div>

      {stats && (
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <StatsBlock stats={stats} />
        </div>
      )}

      {!descriptionOverride && !stats && !hideDescription && (
        <div
          className="mt-3 rounded-md p-3"
          style={{ borderLeft: `3px solid ${t.color}`, backgroundColor: "rgba(150,162,131,0.08)" }}
        >
          <p className="text-[var(--color-fg-secondary)]" style={{ fontSize: 12, lineHeight: 1.45 }}>
            {t.description}
          </p>
        </div>
      )}
    </div>
  );
}
