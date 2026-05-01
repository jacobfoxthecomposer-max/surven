"use client";

import * as React from "react";

type Tier = { label: string; color: string; description: string };

const tierFor = (s: number): Tier =>
  s < 26
    ? { label: "Poor", color: "#B54631", description: "Major crawlability issues are blocking AI from indexing your site." }
    : s < 56
    ? { label: "Fair", color: "#C97B45", description: "Several issues are limiting how AI can crawl your site." }
    : s < 81
    ? { label: "Good", color: "#96A283", description: "AI can crawl your site well — a few improvements remain." }
    : { label: "Excellent", color: "#7D8E6C", description: "Your site is well-configured for AI and search crawlers." };

const polar = (cx: number, cy: number, r: number, deg: number) => ({
  x: cx - r * Math.cos((deg * Math.PI) / 180),
  y: cy - r * Math.sin((deg * Math.PI) / 180),
});

const arc = (cx: number, cy: number, r: number, a: number, b: number) => {
  const s = polar(cx, cy, r, a);
  const e = polar(cx, cy, r, b);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};

export interface CrawlabilityScoreGaugeProps {
  score: number;
  width?: number;
}

export function CrawlabilityScoreGauge({ score, width = 280 }: CrawlabilityScoreGaugeProps) {
  const t = tierFor(score);
  const cx = 130, cy = 120, r = 88, stroke = 20;

  // Animate score on mount
  const [displayScore, setDisplayScore] = React.useState(0);
  React.useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1500;
    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplayScore(score * eased);
      if (elapsed < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const angle = Math.max(2, Math.min(180, (displayScore / 100) * 180));
  const tip = polar(cx, cy, r, angle);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full"
      style={{ width }}
    >
      <div className="mb-2">
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--color-fg)",
            letterSpacing: "-0.01em",
          }}
        >
          Crawlability Score
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
          How easily AI can read your site
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex justify-center w-full">
          <div className="relative" style={{ width: "100%" }}>
            <svg viewBox="0 0 260 150" width="100%" style={{ display: "block" }}>
              <defs>
                <linearGradient id="csgTrack" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#B54631" stopOpacity="0.32" />
                  <stop offset="33%" stopColor="#C97B45" stopOpacity="0.38" />
                  <stop offset="66%" stopColor="#96A283" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#7D8E6C" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path d={arc(cx, cy, r, 0, 180)} stroke="url(#csgTrack)" strokeWidth={stroke} fill="none" strokeLinecap="round" />
              <path d={arc(cx, cy, r, 0, angle)} stroke={t.color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
              <polygon
                points={`${tip.x},${tip.y - 14} ${tip.x - 6},${tip.y - 4} ${tip.x + 6},${tip.y - 4}`}
                fill={t.color}
                transform={`rotate(${angle - 90} ${tip.x} ${tip.y - 4})`}
              />
              <text
                x={cx}
                y={cy - 16}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 52,
                  fontWeight: 600,
                  fill: t.color,
                  letterSpacing: "-0.02em",
                }}
              >
                {Math.round(displayScore)}
              </text>
              <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--color-fg-muted)" fontSize="13">
                /100
              </text>
              <text
                x={cx}
                y={cy + 26}
                textAnchor="middle"
                style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, fill: "var(--color-fg)" }}
              >
                {t.label}
              </text>
            </svg>
          </div>
        </div>
      </div>
      <div
        className="mt-3 rounded-md p-3"
        style={{ borderLeft: `3px solid ${t.color}`, backgroundColor: "rgba(150,162,131,0.08)" }}
      >
        <p className="text-[var(--color-fg-secondary)]" style={{ fontSize: 12, lineHeight: 1.45 }}>
          {t.description}
        </p>
      </div>
    </div>
  );
}
