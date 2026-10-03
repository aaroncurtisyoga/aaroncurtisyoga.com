const ONE_HOUR = 60 * 60 * 1000;

// Form values can come back from sessionStorage as ISO strings
const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * The end time to pair with a newly picked start. Moving the start carries the
 * end along so the event keeps its length, the way a calendar app does. With
 * no usable length to keep (no end yet, or an end at or before the old start)
 * it falls back to one hour.
 */
export function endForNewStart(
  newStart: Date,
  oldStart: unknown,
  oldEnd: unknown,
): Date {
  const start = toDate(oldStart);
  const end = toDate(oldEnd);
  const length =
    start && end && end.getTime() > start.getTime()
      ? end.getTime() - start.getTime()
      : ONE_HOUR;
  return new Date(newStart.getTime() + length);
}
