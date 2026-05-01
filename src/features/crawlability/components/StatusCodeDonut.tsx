"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { StatusBreakdown } from "@/types/crawlability";

// HTTP status codes are semantically ranked (success → redirect → error → fatal),
// so colors come from SURVEN_SEMANTIC. 4xx uses warning orange since it sits
// between "mid" and "bad" in severity.
const COLORS_MAP = {
  "2xx": SURVEN_SEMANTIC.good,    // sage — page loaded fine
  "3xx": SURVEN_SEMANTIC.mid,     // gold — redirect, watch
  "4xx": "#C97B45",               // warning orange — client error
  "5xx": SURVEN_SEMANTIC.bad,     // rust — server error, blocks AI
} as const;

const LABELS: Record<keyof StatusBreakdown, string> = {
  "2xx": "Success (2xx)",
  "3xx": "Redirects (3xx)",
  "4xx": "Client Errors (4xx)",
  "5xx": "Server Errors (5xx)",
};

export function StatusCodeDonut({ breakdown }: { breakdown: StatusBreakdown }) {
  const total = breakdown["2xx"] + breakdown["3xx"] + breakdown["4xx"] + breakdown["5xx"];
  const data = (Object.keys(breakdown) as Array<keyof StatusBreakdown>)
    .filter((k) => breakdown[k] > 0)
    .map((k) => ({
      name: LABELS[k],
      value: breakdown[k],
      color: COLORS_MAP[k],
      key: k,
    }));

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            HTTP Status Breakdown
          </h3>
          <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
            How {total} crawled page{total !== 1 ? "s" : ""} responded
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 flex-1">
        <div className="w-full sm:w-1/2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                stroke="var(--color-bg)"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return [`${n} page${n !== 1 ? "s" : ""}`, String(name)];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full sm:w-1/2 space-y-2">
          {(Object.keys(breakdown) as Array<keyof StatusBreakdown>).map((key) => {
            const count = breakdown[key];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <HoverHint
                key={key}
                hint={
                  key === "2xx"
                    ? "Pages that loaded successfully"
                    : key === "3xx"
                    ? "Pages that redirected — too many indicate inefficiency"
                    : key === "4xx"
                    ? "Pages that returned client errors (404, 403, etc.)"
                    : "Pages that returned server errors — block AI completely"
                }
                display="block"
              >
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]/40"
                  style={{ cursor: "help" }}
                >
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS_MAP[key] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-fg)]">
                      {LABELS[key]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="tabular-nums font-semibold"
                      style={{ fontSize: 14, color: COLORS_MAP[key] }}
                    >
                      {count}
                    </p>
                    <p className="text-[10px] text-[var(--color-fg-muted)] tabular-nums">
                      {pct}%
                    </p>
                  </div>
                </div>
              </HoverHint>
            );
          })}
        </div>
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Slices",
            body: "Each slice is one HTTP status code group — 2xx (success), 3xx (redirect), 4xx (client error), 5xx (server error).",
          },
          {
            label: "Slice size",
            body: "Number of crawled pages that returned that status. Right-side rows show the same data as a count + percentage.",
          },
          {
            label: "Colors",
            body: "Semantic — sage = success (good), gold = redirects (watch), orange = client errors (problem), rust = server errors (blocks AI completely).",
          },
          {
            label: "Why it matters",
            body: "AI engines stop crawling pages that 404 or 500. A high 4xx/5xx share means AI is hitting walls when trying to learn about your business.",
          },
        ]}
        tip="Hover any row for what that status code means. Mostly sage = healthy. Rust slice = stop everything and fix your server."
      />
    </div>
  );
}
