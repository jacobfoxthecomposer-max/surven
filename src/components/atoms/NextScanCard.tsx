"use client";

import { HoverHint } from "@/components/atoms/HoverHint";
import { COLORS } from "@/utils/constants";

const DEFAULT_PROMPT_COUNT = 248;

function getNextMondayScan() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(9, 0, 0, 0);
  return { date: next, days: daysUntilMonday };
}

function fmtScanDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

interface NextScanCardProps {
  days?: number;
  date?: Date;
  promptCount?: number;
}

export function NextScanCard({ days, date, promptCount = DEFAULT_PROMPT_COUNT }: NextScanCardProps = {}) {
  const fallback = getNextMondayScan();
  const d = days ?? fallback.days;
  const dt = date ?? fallback.date;

  return (
    <div
      className="rounded-[var(--radius-lg)] px-5 py-4"
      style={{
        borderLeft: `4px solid ${COLORS.primary}`,
        backgroundColor: "rgba(150,162,131,0.10)",
        width: 320,
      }}
    >
      <p
        className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-1"
        style={{ fontSize: 11, letterSpacing: "0.12em" }}
      >
        Next scan
      </p>
      <HoverHint
        hint="Days until your next automatic scan across every AI tool."
        display="inline-block"
        placement="left"
      >
        <div className="flex items-baseline gap-1.5 mb-1">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 600,
              color: "var(--color-fg)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {d}
          </span>
          <span
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            {d === 1 ? "day" : "days"}
          </span>
        </div>
      </HoverHint>
      <HoverHint
        hint={`Next scan date and the ${promptCount} prompts we'll run.`}
        display="block"
        placement="left"
      >
        <p className="text-[var(--color-fg-muted)]" style={{ fontSize: 12 }}>
          {fmtScanDate(dt)} · {promptCount} prompts
        </p>
      </HoverHint>
    </div>
  );
}
