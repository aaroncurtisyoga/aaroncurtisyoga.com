const ET = "America/New_York";

// YYYY-MM-DD for the given instant, on the Eastern calendar.
const etDayKey = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: ET });

const dayKeyToUTC = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Whole Eastern calendar days from `now` to `start`: 0 is today, 1 is
 * tomorrow. Counting calendar days (not 24-hour blocks) is what "in 2 days"
 * means to a reader, and it keeps the label stable across a whole day.
 */
export function daysUntilInET(start: Date | string, now: Date): number {
  return Math.round(
    (dayKeyToUTC(etDayKey(start)) - dayKeyToUTC(etDayKey(now))) / 86_400_000,
  );
}

/** Copy for the hero label: "today", "tomorrow", or "in N days". */
export function describeDaysUntil(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
