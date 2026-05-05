"use client";

import { HoverHint } from "@/components/atoms/HoverHint";
import { COLORS, getPromptCountForPlan } from "@/utils/constants";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";

function getNextMondayScan() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday = 1. If today is Monday, daysUntilMonday = 0 (scan runs today).
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
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

export function NextScanCard({ days, date, promptCount }: NextScanCardProps = {}) {
  const fallback = getNextMondayScan();
  const d = days ?? fallback.days;
  const dt = date ?? fallback.date;

  const { plan } = useUserProfile();
  const resolvedPromptCount = promptCount ?? getPromptCountForPlan(plan);

  const isToday = d === 0;
  const valueText = isToday ? "Today" : String(d);
  const unitText = isToday ? "" : d === 1 ? "day" : "days";

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
        hint={
          isToday
            ? "Your weekly automatic scan runs today across every AI tool."
            : "Days until your next automatic scan across every AI tool."
        }
        display="inline-block"
        placement="left"
      >
        <div className="flex items-baseline gap-1.5 mb-1">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: isToday ? 28 : 36,
              fontWeight: 600,
              color: "var(--color-fg)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {valueText}
          </span>
          {unitText && (
            <span
              className="text-[var(--color-fg-secondary)]"
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {unitText}
            </span>
          )}
        </div>
      </HoverHint>
      <HoverHint
        hint={`Next scan date and the ${resolvedPromptCount} prompts we'll run on your ${plan || "current"} plan.`}
        display="block"
        placement="left"
      >
        <p className="text-[var(--color-fg-muted)]" style={{ fontSize: 12 }}>
          {fmtScanDate(dt)} · {resolvedPromptCount} prompts
        </p>
      </HoverHint>
    </div>
  );
}
