import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Event } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDateTime = (dateInput: Date | string) => {
  // Handle different input types - convert to Date object
  let dateString: Date;
  if (typeof dateInput === "string") {
    dateString = new Date(dateInput);
  } else {
    dateString = dateInput;
  }

  // Validate that we have a valid date
  if (isNaN(dateString.getTime())) {
    console.error("Invalid date provided to formatDateTime:", dateInput);
    // Return fallback values for invalid dates
    return {
      dateTime: "Invalid Date",
      dateOnly: "Invalid Date",
      dateOnlyWithoutYear: "Invalid Date",
      dateShortWithoutYear: "Invalid Date",
      dateLongWithoutYear: "Invalid Date",
      timeOnly: "Invalid Time",
      monthYear: "Invalid Date",
      monthShort: "N/A",
      monthLong: "N/A",
      dayNumber: 0,
      year: 0,
      weekdayShort: "N/A",
      weekdayLong: "N/A",
    };
  }
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    day: "numeric", // numeric day of the month (e.g., '25')
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
    timeZone: "America/New_York", // Force EST/EDT timezone
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    year: "numeric",
    day: "numeric",
    timeZone: "America/New_York",
  };

  const dateOptionsWithoutYear: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  };

  // "Sat, Sep 27"
  const dateOptionsShortWithoutYear: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  };

  const dateOptionsLongWithoutYear: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "America/New_York", // Force EST/EDT timezone for display
  };

  const monthYearOptions: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  };

  const formattedDateTime: string = new Date(dateString).toLocaleString(
    "en-US",
    dateTimeOptions,
  );

  const formattedDate: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptions,
  );

  const formattedDateWithoutYear: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptionsWithoutYear,
  );

  const formattedDateShortWithoutYear: string = new Date(
    dateString,
  ).toLocaleString("en-US", dateOptionsShortWithoutYear);

  const formattedDateLongWithoutYear: string = new Date(
    dateString,
  ).toLocaleString("en-US", dateOptionsLongWithoutYear);

  const formattedTime: string = new Date(dateString).toLocaleString(
    "en-US",
    timeOptions,
  );

  const formattedMonthYear: string = new Date(dateString).toLocaleString(
    "en-US",
    monthYearOptions,
  );

  // Additional formatted parts - use EST/EDT timezone
  const date = new Date(dateString);
  const monthShort = date
    .toLocaleDateString("en-US", {
      month: "short",
      timeZone: "America/New_York",
    })
    .toUpperCase();
  const monthLong = date.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "America/New_York",
  });
  const dayNumber = parseInt(
    date.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "America/New_York",
    }),
  );
  const year = parseInt(
    date.toLocaleDateString("en-US", {
      year: "numeric",
      timeZone: "America/New_York",
    }),
  );
  const weekdayShort = date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "America/New_York",
  });
  const weekdayLong = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });

  return {
    dateTime: formattedDateTime,
    dateOnly: formattedDate,
    dateOnlyWithoutYear: formattedDateWithoutYear,
    dateShortWithoutYear: formattedDateShortWithoutYear,
    dateLongWithoutYear: formattedDateLongWithoutYear,
    timeOnly: formattedTime,
    monthYear: formattedMonthYear,
    monthShort,
    monthLong,
    dayNumber,
    year,
    weekdayShort,
    weekdayLong,
  };
};

type BookableEvent = Pick<
  Event,
  | "id"
  | "isHostedExternally"
  | "isExternal"
  | "externalRegistrationUrl"
  | "externalUrl"
>;

/**
 * Where a class card should send the visitor. Synced events (Momence/DCBP)
 * carry their booking link in externalUrl and manually entered external
 * events in externalRegistrationUrl; go straight to whichever real booking
 * page exists, else the on-site event page.
 */
export function getEventBookingLink(event: BookableEvent) {
  const bookingUrl = event.externalRegistrationUrl || event.externalUrl;
  const external =
    (event.isHostedExternally || event.isExternal) && Boolean(bookingUrl);
  return {
    href: external && bookingUrl ? bookingUrl : `/events/${event.id}`,
    external,
  };
}

export const formatPrice = (price: string) => {
  const amount = parseFloat(price);
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return formattedPrice;
};

// Always throws — annotated `never` so callers don't need an unreachable
// return after it, and so the "server actions surface errors by throwing"
// contract is explicit in the type.
export const handleError = (error: unknown, _message?: unknown): never => {
  console.error(error);
  throw new Error(typeof error === "string" ? error : JSON.stringify(error));
};

/**
 * Convert stored TipTap HTML to plain text for card teasers and previews.
 * Server-safe (no DOM). Also returns "" for visually empty editor output
 * like `<p class="my-2"></p>`.
 */
export const richTextToPlainText = (html: string | null | undefined): string =>
  (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// Re-export utilities
export * from "./query-builders";

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const isToday = (dateInput: Date | string): boolean => {
  const today = new Date();
  const eventDate =
    typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const opts: Intl.DateTimeFormatOptions = { timeZone: "America/New_York" };
  return (
    today.toLocaleDateString("en-US", opts) ===
    eventDate.toLocaleDateString("en-US", opts)
  );
};
