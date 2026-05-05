export type TimeRange = "14d" | "30d" | "90d" | "ytd" | "all" | "custom";

export interface RangeBounds {
  start: Date | null;
  end: Date | null;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getRangeBounds(
  range: TimeRange,
  customStart?: Date | null,
  customEnd?: Date | null,
): RangeBounds {
  const now = new Date();

  switch (range) {
    case "14d":
      return { start: daysAgo(14), end: now };
    case "30d":
      return { start: daysAgo(30), end: now };
    case "90d":
      return { start: daysAgo(90), end: now };
    case "ytd": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    case "custom":
      return { start: customStart ?? null, end: customEnd ?? now };
    case "all":
    default:
      return { start: null, end: null };
  }
}

export function isDateInRange(dateStr: string, bounds: RangeBounds): boolean {
  const d = new Date(dateStr);
  if (bounds.start && d < bounds.start) return false;
  if (bounds.end && d > bounds.end) return false;
  return true;
}
