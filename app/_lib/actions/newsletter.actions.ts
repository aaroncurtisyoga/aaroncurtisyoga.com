"use server";

import type { Newsletter } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/app/_lib/auth";
import { NEWSLETTERS_CACHE_TAG } from "@/app/_lib/constants/cache-tags";
import { z } from "zod";
import {
  findNewsletterContentIssues,
  renderNewsletterHtml,
  renderNewsletterText,
  resolveMergeTags,
} from "@/app/_lib/email/newsletter-template";
import prisma from "@/app/_lib/prisma";
import resend from "@/app/_lib/resend";
import {
  getEventsByWeek,
  getFeaturedEvents,
  getNextEventStart,
} from "@/app/_lib/actions/event.actions";
import {
  NEWSLETTER_SCHEDULE_MAX_DAYS,
  NewsletterComposeSchema,
  NewsletterFormSchema,
  NewsletterSubscriberSchema,
  NewsletterSubscriberUpdateSchema,
} from "@/app/_lib/schema";
import {
  eventListItemHtml,
  NEWSLETTER_SITE_URL,
} from "@/app/_lib/email/event-html";
import { EventWithLocationAndCategory } from "@/app/_lib/types";
import { toDateKey } from "@/app/_lib/utils";
import { serialize } from "@/app/_lib/utils/serialize";

type SignupInputs = z.infer<typeof NewsletterFormSchema>;
type SubscriberInputs = z.infer<typeof NewsletterSubscriberSchema>;
type SubscriberUpdateInputs = z.infer<typeof NewsletterSubscriberUpdateSchema>;
type ComposeInputs = z.infer<typeof NewsletterComposeSchema>;

type EventSectionOptions = {
  includeUpcoming?: boolean;
  includeClasses?: boolean;
  includeDescriptions?: boolean;
  /**
   * The moment the email will actually reach inboxes. Scheduled sends pass
   * their send time so "Classes This Week" is the send week (not the
   * compose-click week) and events that finish before the send are dropped.
   * Defaults to now.
   */
  at?: Date;
};

const NEWSLETTER_ADMIN_PATH = "/admin/newsletter";

/* -------------------------------- Helpers -------------------------------- */

function getResendConfig() {
  const segmentId = process.env.RESEND_SEGMENT_ID;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!segmentId || !from) {
    throw new Error(
      "Missing RESEND_SEGMENT_ID or RESEND_FROM_EMAIL environment variable",
    );
  }
  return { segmentId, from };
}

/* ----------------------------- Public signup ----------------------------- */

export async function addNewsletterEntry(data: SignupInputs) {
  const formValidationResult = NewsletterFormSchema.safeParse(data);

  if (formValidationResult.success === false) {
    return { formErrors: formValidationResult.error.format() };
  }

  try {
    const segmentId = process.env.RESEND_SEGMENT_ID;
    const { error } = await resend.contacts.create({
      email: formValidationResult.data.email,
      firstName: formValidationResult.data.firstName?.trim() || undefined,
      segments: segmentId ? [{ id: segmentId }] : undefined,
    });

    if (error) {
      if (/already exist/i.test(error.message)) {
        // Deliberately indistinguishable from a fresh signup. This action is
        // unauthenticated, so returning "already subscribed" would let anyone
        // test whether a given address is on the list.
        console.info("[newsletter] signup for an address already subscribed");
        return { message: "You're on the list!" };
      }
      console.error("Newsletter subscription error:", error);
      return {
        apiError: "Failed to subscribe.",
        message: "Sorry. Something went wrong. Please try again later!",
      };
    }

    return { message: "You're on the list!" };
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return {
      apiError: "Failed to subscribe.",
      message: "Sorry. Something went wrong. Please try again later!",
    };
  }
}

/* --------------------------- Admin: subscribers -------------------------- */

// `field: "email"` marks errors the client should show inline on the email
// input (bad address, already subscribed); everything else is infrastructure
// and belongs in a toast.
type AddSubscriberResult = {
  status: boolean;
  message: string;
  field?: "email";
};

export async function addSubscriber(
  data: SubscriberInputs,
): Promise<AddSubscriberResult> {
  await requireAdmin();

  const validation = NewsletterSubscriberSchema.safeParse(data);
  if (!validation.success) {
    return {
      status: false,
      message: "Please enter a valid email address.",
      field: "email",
    };
  }

  try {
    const segmentId = process.env.RESEND_SEGMENT_ID;
    if (!segmentId) {
      return {
        status: false,
        message: "Missing RESEND_SEGMENT_ID environment variable.",
      };
    }

    const firstName = validation.data.firstName?.trim() || undefined;
    const lastName = validation.data.lastName?.trim() || undefined;

    const { error } = await resend.contacts.create({
      email: validation.data.email,
      firstName,
      lastName,
      segments: [{ id: segmentId }],
    });

    if (error) {
      if (/already exist/i.test(error.message)) {
        return {
          status: false,
          message: "That email is already subscribed.",
          field: "email",
        };
      }
      console.error("Failed to add subscriber:", error);
      return { status: false, message: "Resend rejected the subscriber." };
    }

    return { status: true, message: "Subscriber added." };
  } catch (error) {
    console.error("Failed to add subscriber:", error);
    return { status: false, message: "Failed to add the subscriber." };
  }
}

/* -------------------------- Admin: subscriber CRUD ----------------------- */

export type Subscriber = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  unsubscribed: boolean;
  createdAt: string;
};

/**
 * Resend paginates contacts (max 100 per page, cursor-based). Walk every page
 * so the admin sees the whole list and gets an accurate count — the yoga list
 * is small enough that fetching it all is cheaper than partial + guessing.
 */
async function fetchAllSubscribers(): Promise<{
  subscribers: Subscriber[];
  capped: boolean;
  failed: boolean;
  /**
   * True only when every page was walked cleanly. A mid-pagination failure
   * still yields a usable partial list for the admin view (failed stays
   * false), but callers persisting counts must require complete — a partial
   * total stored as "the audience size" reads as data, not as a gap.
   */
  complete: boolean;
}> {
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!segmentId) {
    return { subscribers: [], capped: false, failed: false, complete: false };
  }

  const subscribers: Subscriber[] = [];
  let after: string | undefined;
  const MAX_PAGES = 100; // 100 pages * 100 = 10k contacts safety ceiling

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await resend.contacts.list(
      after ? { segmentId, limit: 100, after } : { segmentId, limit: 100 },
    );
    if (error || !data) {
      // A failure before we've read anything is a hard error worth surfacing;
      // a failure partway through still leaves a usable (if partial) list.
      return {
        subscribers,
        capped: false,
        failed: subscribers.length === 0,
        complete: false,
      };
    }

    for (const contact of data.data) {
      subscribers.push({
        id: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        unsubscribed: contact.unsubscribed,
        createdAt: contact.created_at,
      });
    }

    if (!data.has_more || data.data.length === 0) {
      return { subscribers, capped: false, failed: false, complete: true };
    }
    after = data.data[data.data.length - 1].id;
  }

  // Fell out of the loop still seeing has_more — list is larger than the cap.
  return { subscribers, capped: true, failed: false, complete: false };
}

export async function listSubscribers() {
  await requireAdmin();
  try {
    const segmentId = process.env.RESEND_SEGMENT_ID;
    if (!segmentId) {
      return {
        status: false as const,
        message: "Missing RESEND_SEGMENT_ID environment variable.",
        subscribers: [] as Subscriber[],
        capped: false,
      };
    }

    const { subscribers, capped, failed } = await fetchAllSubscribers();
    if (failed) {
      return {
        status: false as const,
        message: "Couldn't reach Resend. Please try again.",
        subscribers: [] as Subscriber[],
        capped: false,
      };
    }
    // Newest first
    subscribers.sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
    return { status: true as const, subscribers, capped };
  } catch (error) {
    console.error("Failed to list subscribers:", error);
    return {
      status: false as const,
      message: "Failed to load subscribers.",
      subscribers: [] as Subscriber[],
      capped: false,
    };
  }
}

export async function updateSubscriber(
  data: SubscriberUpdateInputs,
): Promise<AddSubscriberResult> {
  await requireAdmin();

  const validation = NewsletterSubscriberUpdateSchema.safeParse(data);
  if (!validation.success) {
    return {
      status: false,
      message: "Please check the details and try again.",
    };
  }

  try {
    const { id, firstName, lastName, unsubscribed } = validation.data;

    // Only send the fields the caller actually provided. A blank name field is
    // an intentional clear (null); an omitted field is left untouched — that's
    // what keeps the quick unsubscribe toggle from wiping someone's name.
    const payload: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      unsubscribed?: boolean;
    } = { id };
    if (firstName !== undefined) payload.firstName = firstName.trim() || null;
    if (lastName !== undefined) payload.lastName = lastName.trim() || null;
    if (unsubscribed !== undefined) payload.unsubscribed = unsubscribed;

    const { error } = await resend.contacts.update(payload);
    if (error) {
      console.error("Failed to update subscriber:", error);
      return { status: false, message: "Resend rejected the update." };
    }
    return { status: true, message: "Subscriber updated." };
  } catch (error) {
    console.error("Failed to update subscriber:", error);
    return { status: false, message: "Failed to update the subscriber." };
  }
}

export async function deleteSubscriber(
  id: string,
): Promise<AddSubscriberResult> {
  await requireAdmin();
  if (!id) return { status: false, message: "Missing subscriber id." };

  try {
    const { error } = await resend.contacts.remove(id);
    if (error) {
      console.error("Failed to remove subscriber:", error);
      return { status: false, message: "Resend rejected the removal." };
    }
    return { status: true, message: "Subscriber removed." };
  } catch (error) {
    console.error("Failed to remove subscriber:", error);
    return { status: false, message: "Failed to remove the subscriber." };
  }
}

/* ------------------------------ Admin: CRUD ------------------------------ */

export async function getNewsletters() {
  await requireAdmin();
  try {
    await reconcileScheduledNewsletters();
    const newsletters = await prisma.newsletter.findMany({
      orderBy: { updatedAt: "desc" },
      // The list never renders the snapshot, and shipping every full email
      // HTML to the table adds up fast. Only getNewsletterById needs it.
      omit: { sentHtml: true },
    });
    return serialize(newsletters) as unknown as Newsletter[];
  } catch (error) {
    console.error("Failed to fetch newsletters:", error);
    return [];
  }
}

export async function getNewsletterById(id: string) {
  await requireAdmin();
  try {
    const newsletter = await prisma.newsletter.findUnique({ where: { id } });
    return newsletter ? (serialize(newsletter) as unknown as Newsletter) : null;
  } catch (error) {
    console.error("Failed to fetch newsletter:", error);
    return null;
  }
}

export async function createNewsletter(
  data: ComposeInputs,
  opts?: { revalidate?: boolean },
) {
  await requireAdmin();
  const validation = NewsletterComposeSchema.safeParse(data);
  if (!validation.success) {
    return { status: false, message: "Please fix the form errors." };
  }

  try {
    const newsletter = await prisma.newsletter.create({
      data: validation.data,
    });
    // Autosave passes revalidate: false — invalidating the router cache on
    // every keystroke-debounce would churn the whole admin section for nothing.
    if (opts?.revalidate !== false) revalidatePath(NEWSLETTER_ADMIN_PATH);
    return { status: true, data: serialize(newsletter) };
  } catch (error) {
    console.error("Failed to create newsletter:", error);
    return { status: false, message: "Failed to save the draft." };
  }
}

export async function updateNewsletter(
  id: string,
  data: ComposeInputs,
  opts?: { revalidate?: boolean },
) {
  await requireAdmin();
  const validation = NewsletterComposeSchema.safeParse(data);
  if (!validation.success) {
    return { status: false, message: "Please fix the form errors." };
  }

  try {
    const existing = await prisma.newsletter.findUnique({ where: { id } });
    if (!existing) {
      return { status: false, message: "Newsletter not found." };
    }
    if (existing.status !== "DRAFT") {
      return { status: false, message: "Only drafts can be edited." };
    }

    const newsletter = await prisma.newsletter.update({
      where: { id },
      data: validation.data,
    });
    if (opts?.revalidate !== false) revalidatePath(NEWSLETTER_ADMIN_PATH);
    return { status: true, data: serialize(newsletter) };
  } catch (error) {
    console.error("Failed to update newsletter:", error);
    return { status: false, message: "Failed to save the draft." };
  }
}

export async function deleteNewsletter(id: string) {
  await requireAdmin();
  try {
    const existing = await prisma.newsletter.findUnique({ where: { id } });
    if (!existing) {
      return { status: false, message: "Newsletter not found." };
    }
    if (existing.status === "SCHEDULED") {
      return {
        status: false,
        message: "Cancel the scheduled send first, then delete the draft.",
      };
    }

    await prisma.newsletter.delete({ where: { id } });
    revalidatePath(NEWSLETTER_ADMIN_PATH);
    // Deleting a SENT newsletter removes it from the public archive.
    if (existing.status === "SENT") {
      revalidateTag(NEWSLETTERS_CACHE_TAG, { expire: 0 });
    }
    return { status: true };
  } catch (error) {
    console.error("Failed to delete newsletter:", error);
    return { status: false, message: "Failed to delete the newsletter." };
  }
}

export async function duplicateNewsletter(id: string) {
  await requireAdmin();
  try {
    const existing = await prisma.newsletter.findUnique({ where: { id } });
    if (!existing) {
      return { status: false, message: "Newsletter not found." };
    }

    const copy = await prisma.newsletter.create({
      data: {
        subject: `${existing.subject} (copy)`,
        previewText: existing.previewText,
        content: existing.content,
        includeUpcoming: existing.includeUpcoming,
        includeClasses: existing.includeClasses,
        includeDescriptions: existing.includeDescriptions,
      },
    });
    revalidatePath(NEWSLETTER_ADMIN_PATH);
    return { status: true, data: serialize(copy) };
  } catch (error) {
    console.error("Failed to duplicate newsletter:", error);
    return { status: false, message: "Failed to duplicate the newsletter." };
  }
}

/* ----------------------------- Admin: sending ---------------------------- */

export async function sendNewsletter(id: string, scheduledAtIso?: string) {
  await requireAdmin();
  try {
    const { segmentId, from } = getResendConfig();

    const newsletter = await prisma.newsletter.findUnique({ where: { id } });
    if (!newsletter) {
      return { status: false, message: "Newsletter not found." };
    }
    if (newsletter.status !== "DRAFT") {
      return { status: false, message: "Only drafts can be sent." };
    }

    // Broadcasts fire with no undo — refuse anything still carrying template
    // scaffolding or a merge tag Resend won't substitute. The composer's Send
    // dialog shows the same issues before this ever runs.
    const { blockers } = findNewsletterContentIssues(newsletter.content);
    if (blockers.length > 0) {
      return {
        status: false,
        message: `Not sent — ${blockers[0]}${
          blockers.length > 1 ? ` (+${blockers.length - 1} more)` : ""
        }.`,
      };
    }

    // A DRAFT that still carries a broadcast id means an earlier send attempt
    // made it partway (or a scheduled send was cancelled mid-flight). Check
    // Resend before creating a second broadcast so a retry can't double-send.
    if (newsletter.resendBroadcastId) {
      const { data: existing, error: getError } = await resend.broadcasts.get(
        newsletter.resendBroadcastId,
      );
      // The SDK reports failures via `error`, not exceptions. A not_found just
      // means the old broadcast is gone (safe to build a fresh one); anything
      // else means we can't tell whether it already sent — refuse to risk a
      // duplicate blast.
      if (getError && getError.name !== "not_found") {
        console.error("Failed to check existing broadcast:", getError);
        return {
          status: false,
          message:
            "Couldn't confirm the previous send attempt with Resend. Try again in a moment.",
        };
      }
      if (existing?.status === "sent") {
        await prisma.newsletter.update({
          where: { id },
          data: {
            status: "SENT",
            sentAt: existing.sent_at ? new Date(existing.sent_at) : new Date(),
          },
        });
        revalidatePath(NEWSLETTER_ADMIN_PATH);
        // This is a SENT transition like any other — the public archive (and
        // any cached 404 for this id) must refresh.
        revalidateTag(NEWSLETTERS_CACHE_TAG, { expire: 0 });
        return {
          status: false,
          message: "This newsletter already went out — refresh the list.",
        };
      }
      if (existing?.status === "queued") {
        // Recover the schedule too, or reconciliation can never flip the row
        // to SENT (it only looks at past-due scheduledAt values).
        await prisma.newsletter.update({
          where: { id },
          data: {
            status: "SCHEDULED",
            scheduledAt: existing.scheduled_at
              ? new Date(existing.scheduled_at)
              : new Date(),
          },
        });
        revalidatePath(NEWSLETTER_ADMIN_PATH);
        return {
          status: false,
          message:
            "This newsletter is already queued in Resend — refresh the list.",
        };
      }
      // A leftover draft broadcast is stale (content may have changed since);
      // clear it out and build a fresh one below.
      if (existing) {
        await resend.broadcasts.remove(newsletter.resendBroadcastId);
      }
    }

    let scheduledAt: Date | undefined;
    if (scheduledAtIso) {
      scheduledAt = new Date(scheduledAtIso);
      if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        return {
          status: false,
          message: "The scheduled time must be in the future.",
        };
      }
      const maxSchedule = new Date(
        Date.now() + NEWSLETTER_SCHEDULE_MAX_DAYS * 24 * 60 * 60 * 1000,
      );
      if (scheduledAt > maxSchedule) {
        return {
          status: false,
          message: `Resend can schedule up to ${NEWSLETTER_SCHEDULE_MAX_DAYS} days ahead — pick an earlier time.`,
        };
      }
    }

    // Section toggles live on the row (the composer saves before sending), so
    // the broadcast always matches what the draft last showed. Sections are
    // built for the send moment: a Friday draft scheduled for Monday gets
    // Monday's week, not Friday's leftovers.
    const sections = await buildEventSectionsHtml({
      includeUpcoming: newsletter.includeUpcoming,
      includeClasses: newsletter.includeClasses,
      includeDescriptions: newsletter.includeDescriptions,
      at: scheduledAt,
    });
    const html = renderNewsletterHtml({
      // Resend substitutes the merge tags per-recipient; we only append the
      // live event listings.
      contentHtml: `${newsletter.content}${sections}`,
      previewText: newsletter.previewText ?? undefined,
      viewInBrowserUrl: `${NEWSLETTER_SITE_URL}/newsletter/${id}`,
    });
    // Plain-text alternative (deliverability). Resend runs the same merge-tag
    // substitution on the text part as on the html, so the tags stay raw here
    // — resolving them early would strip per-recipient personalization.
    const text = renderNewsletterText({
      contentHtml: `${newsletter.content}${sections}`,
    });

    // Audience size when the send is initiated ("Delivered 118 of 120").
    // Best-effort and never blocks the send; only a complete page walk
    // counts — persisting a partial total would read as data, not a gap.
    // For scheduled sends this is the size at scheduling time; the UI drops
    // the denominator if the audience outgrew it before the send fired.
    let recipientCount: number | null = null;
    try {
      const audience = await fetchAllSubscribers();
      if (audience.complete) {
        recipientCount = audience.subscribers.filter(
          (s) => !s.unsubscribed,
        ).length;
      }
    } catch {
      // Counters just render without a denominator.
    }

    const createResult = await resend.broadcasts.create({
      segmentId,
      from,
      subject: newsletter.subject,
      previewText: newsletter.previewText ?? undefined,
      name: newsletter.subject,
      html,
      text,
    });
    if (createResult.error || !createResult.data) {
      console.error("Failed to create broadcast:", createResult.error);
      return { status: false, message: "Resend rejected the broadcast." };
    }

    // Persist the broadcast id before sending: if anything past this point
    // fails, the retry guard above finds this broadcast instead of minting a
    // duplicate. The snapshot rides along so a send that succeeds but loses
    // its final status update still knows exactly what Resend was handed —
    // the retry guard only flips status and never rebuilds these.
    await prisma.newsletter.update({
      where: { id },
      data: {
        resendBroadcastId: createResult.data.id,
        sentHtml: html,
        recipientCount,
      },
    });

    const sendResult = await resend.broadcasts.send(
      createResult.data.id,
      scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : undefined,
    );
    if (sendResult.error) {
      console.error("Failed to send broadcast:", sendResult.error);
      return { status: false, message: "Resend failed to send the broadcast." };
    }

    const updated = await prisma.newsletter.update({
      where: { id },
      data: {
        resendBroadcastId: createResult.data.id,
        status: scheduledAt ? "SCHEDULED" : "SENT",
        scheduledAt: scheduledAt ?? null,
        sentAt: scheduledAt ? null : new Date(),
      },
    });

    revalidatePath(NEWSLETTER_ADMIN_PATH);
    // A send-now lands in the public archive immediately.
    if (!scheduledAt) revalidateTag(NEWSLETTERS_CACHE_TAG, { expire: 0 });
    return { status: true, data: serialize(updated) };
  } catch (error) {
    console.error("Failed to send newsletter:", error);
    return {
      status: false,
      message:
        error instanceof Error && error.message.includes("environment")
          ? error.message
          : "Failed to send the newsletter.",
    };
  }
}

export async function sendTestNewsletter(data: ComposeInputs) {
  await requireAdmin();
  const validation = NewsletterComposeSchema.safeParse(data);
  if (!validation.success) {
    return { status: false, message: "Please fix the form errors." };
  }

  try {
    const { from } = getResendConfig();

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return {
        status: false,
        message: "Couldn't determine your email address for the test send.",
      };
    }

    // Test sends work off the (possibly unsaved) form state, so the toggles
    // come from the submitted values rather than the row.
    const sections = await buildEventSectionsHtml({
      includeUpcoming: validation.data.includeUpcoming,
      includeClasses: validation.data.includeClasses,
      includeDescriptions: validation.data.includeDescriptions,
    });
    // The transactional API doesn't substitute merge tags, so resolve them
    // here with the admin's own details for a realistic test.
    const resolvedContent = `${resolveMergeTags(validation.data.content, {
      firstName: user?.firstName ?? undefined,
      lastName: user?.lastName ?? undefined,
      email,
    })}${sections}`;
    const html = renderNewsletterHtml({
      contentHtml: resolvedContent,
      previewText: validation.data.previewText,
      unsubscribeUrl: "#",
    });

    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: `[Test] ${validation.data.subject}`,
      html,
      text: renderNewsletterText({
        contentHtml: resolvedContent,
        unsubscribeUrl: "#",
      }),
    });
    if (error) {
      console.error("Failed to send test email:", error);
      return { status: false, message: "Resend failed to send the test." };
    }

    return { status: true, message: `Test sent to ${email}` };
  } catch (error) {
    console.error("Failed to send test email:", error);
    return { status: false, message: "Failed to send the test email." };
  }
}

export async function getSubscriberCount() {
  await requireAdmin();
  try {
    const segmentId = process.env.RESEND_SEGMENT_ID;
    if (!segmentId) return null;

    const { subscribers, capped, failed } = await fetchAllSubscribers();
    if (failed) return null;
    // Count active subscribers only — unsubscribed contacts still come back
    // from Resend but shouldn't inflate the headline number.
    const count = subscribers.filter((s) => !s.unsubscribed).length;
    return { count, hasMore: capped };
  } catch (error) {
    console.error("Failed to fetch subscriber count:", error);
    return null;
  }
}

// The public archive reads (getPublicNewsletter[s]) live in
// newsletter.queries.ts, alongside their cached wrappers — they take no auth,
// so keeping them out of this "use server" admin module makes that trust
// boundary a file boundary.

export type NewsletterTopLink = { link: string; clicks: number };

export type NewsletterBouncedAddress = { recipient: string; type: string };

/**
 * Addresses that bounced or complained on a sent newsletter — on a small
 * personal list these are usually fixable (typo'd signup) or worth knowing
 * (someone forgot they subscribed). Only rows recorded since the webhook
 * started storing recipients carry an address.
 */
export async function getNewsletterBouncedAddresses(
  id: string,
): Promise<NewsletterBouncedAddress[]> {
  await requireAdmin();
  try {
    const rows = await prisma.newsletterEmailEvent.findMany({
      where: {
        newsletterId: id,
        type: { in: ["email.bounced", "email.complained"] },
        recipient: { not: null },
      },
      select: { recipient: true, type: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({ recipient: row.recipient!, type: row.type }));
  } catch (error) {
    console.error("Failed to fetch bounced addresses:", error);
    return [];
  }
}

/**
 * Unique clickers per URL for a sent newsletter, most-clicked first — which
 * event or offering actually resonated. Fed by the Resend webhook's per-link
 * ledger rows (link != ""); newsletters sent before link tracking existed
 * simply return [].
 */
export async function getNewsletterTopLinks(
  id: string,
): Promise<NewsletterTopLink[]> {
  await requireAdmin();
  try {
    const rows = await prisma.newsletterEmailEvent.groupBy({
      by: ["link"],
      where: { newsletterId: id, type: "email.clicked", link: { not: "" } },
      _count: { link: true },
      orderBy: { _count: { link: "desc" } },
      take: 10,
    });
    return rows.map((row) => ({ link: row.link, clicks: row._count.link }));
  } catch (error) {
    console.error("Failed to fetch newsletter top links:", error);
    return [];
  }
}

/**
 * Pull a scheduled newsletter back out of Resend's queue and return it to
 * DRAFT so it can be edited or re-scheduled.
 */
export async function cancelScheduledNewsletter(id: string) {
  await requireAdmin();
  try {
    const newsletter = await prisma.newsletter.findUnique({ where: { id } });
    if (!newsletter) {
      return { status: false, message: "Newsletter not found." };
    }
    if (newsletter.status !== "SCHEDULED") {
      return {
        status: false,
        message: "Only scheduled sends can be cancelled.",
      };
    }

    const backToDraft = () =>
      prisma.newsletter.update({
        where: { id },
        data: {
          status: "DRAFT",
          scheduledAt: null,
          sentAt: null,
          resendBroadcastId: null,
          // The snapshot described a broadcast that no longer exists; a
          // re-send will bake and store a fresh one.
          sentHtml: null,
          recipientCount: null,
        },
      });

    // A SCHEDULED row without a broadcast id shouldn't exist, but if one does
    // there's nothing queued in Resend to cancel — just unstick the row.
    if (!newsletter.resendBroadcastId) {
      await backToDraft();
      revalidatePath(NEWSLETTER_ADMIN_PATH);
      return { status: true, message: "Send cancelled — back to draft." };
    }

    const { data, error } = await resend.broadcasts.remove(
      newsletter.resendBroadcastId,
    );
    if (error || !data?.deleted) {
      // Removal can fail because the broadcast already went out — check, and
      // reconcile the row instead of leaving it wrongly SCHEDULED.
      const { data: broadcast, error: getError } = await resend.broadcasts.get(
        newsletter.resendBroadcastId,
      );
      if (broadcast?.status === "sent") {
        await prisma.newsletter.update({
          where: { id },
          data: {
            status: "SENT",
            sentAt: broadcast.sent_at
              ? new Date(broadcast.sent_at)
              : new Date(),
          },
        });
        revalidatePath(NEWSLETTER_ADMIN_PATH);
        revalidateTag(NEWSLETTERS_CACHE_TAG, { expire: 0 });
        return {
          status: false,
          message: "Too late — this newsletter already went out.",
        };
      }
      if (!broadcast && getError?.name === "not_found") {
        // Genuinely gone from Resend (e.g. cancelled in their dashboard) —
        // nothing is queued, so just unstick the row. Only a confirmed 404
        // takes this path: a transient failure must NOT report "cancelled"
        // while the email is still queued.
        await backToDraft();
        revalidatePath(NEWSLETTER_ADMIN_PATH);
        return { status: true, message: "Send cancelled — back to draft." };
      }
      console.error("Failed to cancel broadcast:", error, getError);
      return {
        status: false,
        message:
          "Resend couldn't cancel this send. Try again, or cancel it from the Resend dashboard.",
      };
    }

    await backToDraft();
    revalidatePath(NEWSLETTER_ADMIN_PATH);
    return { status: true, message: "Send cancelled — back to draft." };
  } catch (error) {
    console.error("Failed to cancel scheduled newsletter:", error);
    return { status: false, message: "Failed to cancel the scheduled send." };
  }
}

/**
 * Change a scheduled newsletter's send time in one step: pull the queued
 * broadcast back to a draft, then immediately re-send with the new time. The
 * re-send rebuilds the event sections and snapshot for the NEW send moment,
 * which cancel-and-manually-reschedule would also require — this just saves
 * the four screens in between.
 */
export async function rescheduleNewsletter(id: string, scheduledAtIso: string) {
  await requireAdmin();

  // Validate the new time BEFORE touching the queued broadcast — a bad pick
  // must not de-schedule the newsletter it was supposed to move.
  const newTime = new Date(scheduledAtIso);
  if (isNaN(newTime.getTime()) || newTime <= new Date()) {
    return {
      status: false,
      message: "The scheduled time must be in the future.",
    };
  }
  const maxSchedule = new Date(
    Date.now() + NEWSLETTER_SCHEDULE_MAX_DAYS * 24 * 60 * 60 * 1000,
  );
  if (newTime > maxSchedule) {
    return {
      status: false,
      message: `Resend can schedule up to ${NEWSLETTER_SCHEDULE_MAX_DAYS} days ahead — pick an earlier time.`,
    };
  }

  const cancelled = await cancelScheduledNewsletter(id);
  if (!cancelled.status) return cancelled;

  const sent = await sendNewsletter(id, scheduledAtIso);
  if (!sent.status) {
    return {
      status: false,
      message: `The original send was cancelled and the draft is safe, but re-scheduling failed: ${
        sent.message ?? "unknown error."
      } Open the draft and use Send… to pick a new time.`,
    };
  }
  return { status: true, message: "Rescheduled.", data: sent.data };
}

/**
 * Newsletters scheduled through Resend are sent server-side by Resend, so our
 * rows can go stale. Reconcile any past-due SCHEDULED rows against the
 * broadcast status before listing.
 */
async function reconcileScheduledNewsletters() {
  const dueNewsletters = await prisma.newsletter.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });

  let flippedToSent = false;
  for (const newsletter of dueNewsletters) {
    if (!newsletter.resendBroadcastId) continue;
    try {
      const { data } = await resend.broadcasts.get(
        newsletter.resendBroadcastId,
      );
      if (data?.status === "sent") {
        await prisma.newsletter.update({
          where: { id: newsletter.id },
          data: {
            status: "SENT",
            sentAt: data.sent_at ? new Date(data.sent_at) : new Date(),
          },
        });
        flippedToSent = true;
      }
    } catch (error) {
      console.error(`Failed to reconcile newsletter ${newsletter.id}:`, error);
    }
  }
  // A scheduled send that fired shows up in the public archive now.
  if (flippedToSent) revalidateTag(NEWSLETTERS_CACHE_TAG, { expire: 0 });
}

/* ------------------------- Admin: compose helpers ------------------------ */

/** Monday (ET) of the week containing `now`, as a YYYY-MM-DD key. */
function getEtMondayIso(now: Date): string {
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = et.getDay(); // 0 = Sun … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  et.setDate(et.getDate() + diff);
  et.setHours(0, 0, 0, 0);
  return toDateKey(et);
}

/**
 * Builds the "Upcoming" (featured events) and "Classes This Week" (this week's
 * remaining classes) blocks appended after the writer's message. Returns ""
 * when both are empty so the newsletter
 * simply omits them. Kept out of the saved draft so duplicating a newsletter
 * never bakes in a stale snapshot.
 */
async function buildEventSectionsHtml({
  includeUpcoming = true,
  includeClasses = true,
  includeDescriptions = false,
  at,
}: EventSectionOptions = {}): Promise<string> {
  if (!includeUpcoming && !includeClasses) return "";
  try {
    // All "is this still upcoming?" math runs against the send moment, which
    // for scheduled sends is in the future.
    const sendTime = at ?? new Date();
    const sections: string[] = [];

    if (includeUpcoming) {
      // The cutoff goes into the query itself — post-fetch filtering would let
      // events between now and a scheduled send starve the list.
      const upcoming = await getFeaturedEvents(5, sendTime).catch(() => []);
      if (upcoming.length > 0) {
        sections.push(
          `<h2>Upcoming</h2><ul>${upcoming
            .map((event) =>
              eventListItemHtml(event, {
                withDescription: includeDescriptions,
                withCta: true,
              }),
            )
            .join("")}</ul>`,
        );
      }
    }

    if (includeClasses) {
      // Roll forward past empty weeks: anchor on the next upcoming event so the
      // classes block shows the following week's schedule instead of going
      // blank once the current week is over. Stays blank only when nothing at
      // all is on the calendar ahead of the send moment.
      const nextStart = await getNextEventStart(sendTime);
      if (nextStart) {
        const weekMondayIso = getEtMondayIso(nextStart);
        let weekEvents: EventWithLocationAndCategory[] = [];
        try {
          weekEvents = await getEventsByWeek(weekMondayIso);
        } catch {
          weekEvents = [];
        }
        // Only classes still to come — past ones (in the current week) are noise.
        const classesThisWeek = weekEvents.filter(
          (event) => new Date(event.startDateTime) >= sendTime,
        );
        if (classesThisWeek.length > 0) {
          const heading =
            weekMondayIso === getEtMondayIso(sendTime)
              ? "Classes this week"
              : "Upcoming classes";
          sections.push(
            `<h2>${heading}</h2><ul>${classesThisWeek
              .map((event) => eventListItemHtml(event))
              .join("")}</ul>`,
          );
        }
      }
    }

    if (sections.length === 0) return "";
    // A divider separates the writer's message from the auto-added listings.
    return `<hr>${sections.join("")}`;
  } catch (error) {
    console.error("Failed to build newsletter event sections:", error);
    return "";
  }
}

/** Exposed for the composer preview + sent view so they match what's sent. */
export async function getNewsletterEventSectionsHtml(
  opts?: EventSectionOptions,
): Promise<string> {
  await requireAdmin();
  return buildEventSectionsHtml(opts);
}
