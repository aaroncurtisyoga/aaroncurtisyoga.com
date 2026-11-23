"use client";

import { FC, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CalendarOff,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
} from "lucide-react";
import { Newsletter } from "@prisma/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import BasicModal from "@/app/_components/BasicModal";
import NewsletterEditor from "@/app/admin/newsletter/_components/NewsletterEditor";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  cancelScheduledNewsletter,
  duplicateNewsletter,
  getNewsletterBouncedAddresses,
  getNewsletterById,
  getNewsletterEventSectionsHtml,
  getNewsletterTopLinks,
  rescheduleNewsletter,
  type NewsletterBouncedAddress,
  type NewsletterTopLink,
} from "@/app/_lib/actions/newsletter.actions";
import { NEWSLETTER_SCHEDULE_MAX_DAYS } from "@/app/_lib/schema";
import {
  renderNewsletterHtml,
  resolveMergeTags,
} from "@/app/_lib/email/newsletter-template";
import { formatDateTime } from "@/app/_lib/utils";

const NewsletterDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isCopying, setIsCopying] = useState(false);
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [sectionsHtml, setSectionsHtml] = useState("");
  const [topLinks, setTopLinks] = useState<NewsletterTopLink[]>([]);
  const [bounced, setBounced] = useState<NewsletterBouncedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState<Date | undefined>();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUnscheduling, setIsUnscheduling] = useState(false);
  // The send time a newsletter had before Edit pulled it back to a draft, so
  // the editor can offer it again.
  const [resumeScheduledAt, setResumeScheduledAt] = useState<
    Date | undefined
  >();

  const load = useCallback(async () => {
    const data = await getNewsletterById(id);
    setNewsletter(data);
    // The read-only view shows the sentHtml snapshot (exactly what Resend got)
    // when one exists. A scheduled send has none yet, so its sections are
    // built live. An issue sent before snapshots existed shows its message
    // alone, like the public archive: rebuilding the sections now would put
    // today's events in an old email. Drafts render the editor, which fetches
    // its own live sections.
    if (data && data.status !== "DRAFT") {
      const [sections, links, bouncedAddresses] = await Promise.all([
        data.sentHtml || data.status === "SENT"
          ? ""
          : getNewsletterEventSectionsHtml({
              includeUpcoming: data.includeUpcoming,
              includeClasses: data.includeClasses,
              includeDescriptions: data.includeDescriptions,
              excludedEventIds: data.excludedEventIds,
              // A scheduled send's sections are built for its send moment, so
              // preview the same thing here.
              at:
                data.status === "SCHEDULED" && data.scheduledAt
                  ? new Date(data.scheduledAt)
                  : undefined,
            }),
        data.status === "SENT" ? getNewsletterTopLinks(id) : [],
        data.status === "SENT" ? getNewsletterBouncedAddresses(id) : [],
      ]);
      setSectionsHtml(sections);
      setTopLinks(links);
      setBounced(bouncedAddresses);
    } else {
      setSectionsHtml("");
      setTopLinks([]);
      setBounced([]);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The dominant loop is "reuse last month's structure", so start it from the
  // email the admin is already looking at.
  const handleStartCopy = async () => {
    if (!newsletter) return;
    setIsCopying(true);
    try {
      const result = await duplicateNewsletter(newsletter.id);
      if (result.status && result.data) {
        toast.success("Draft created from this newsletter");
        router.push(`/admin/newsletter/${result.data.id}`);
      } else {
        toast.error(result.message ?? "Failed to duplicate the newsletter.");
        setIsCopying(false);
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
      setIsCopying(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newsletter || !rescheduleAt) return;
    if (rescheduleAt <= new Date()) {
      toast.error("The scheduled time must be in the future.");
      return;
    }
    const maxSchedule = new Date(
      Date.now() + NEWSLETTER_SCHEDULE_MAX_DAYS * 24 * 60 * 60 * 1000,
    );
    if (rescheduleAt > maxSchedule) {
      toast.error(
        `Resend can schedule up to ${NEWSLETTER_SCHEDULE_MAX_DAYS} days ahead. Pick an earlier time.`,
      );
      return;
    }

    setIsRescheduling(true);
    try {
      const result = await rescheduleNewsletter(
        newsletter.id,
        rescheduleAt.toISOString(),
      );
      if (result.status) {
        toast.success(
          `Rescheduled for ${formatDateTime(rescheduleAt).dateTime}`,
        );
      } else {
        toast.error(result.message);
      }
      setIsRescheduleOpen(false);
      setRescheduleAt(undefined);
      // Whatever happened (rescheduled, back to draft, or already sent), the
      // row changed, so refetch and re-render the right view.
      await load();
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
    } finally {
      setIsRescheduling(false);
    }
  };

  // Resend can't change a queued broadcast, so editing means taking it out of
  // the queue first. The row comes back as a draft and this page renders the
  // editor, carrying the old send time along.
  const handleConfirmEdit = async () => {
    if (!newsletter) return;
    setIsUnscheduling(true);
    try {
      const previousTime = newsletter.scheduledAt
        ? new Date(newsletter.scheduledAt)
        : undefined;
      const result = await cancelScheduledNewsletter(newsletter.id);
      if (result.status) {
        setResumeScheduledAt(previousTime);
      } else {
        toast.error(result.message);
      }
      setIsEditOpen(false);
      // Draft now, or SENT if it went out before the cancel landed.
      await load();
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
    } finally {
      setIsUnscheduling(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!newsletter) return;
    setIsCanceling(true);
    try {
      const result = await cancelScheduledNewsletter(newsletter.id);
      if (result.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setIsCancelOpen(false);
      // Either way the status may have changed (DRAFT after cancel, SENT if
      // it already went out), so refetch and let the page re-render.
      await load();
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="wrapper max-w-4xl mx-auto text-center py-16 text-muted-foreground">
        Newsletter not found.
      </div>
    );
  }

  if (newsletter.status === "DRAFT") {
    return (
      <div className="wrapper max-w-4xl mx-auto">
        <Link
          href="/admin/newsletter"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Newsletters
        </Link>
        <h1 className="mb-6 font-display text-3xl uppercase text-foreground">
          Newsletter Draft
        </h1>
        <NewsletterEditor
          newsletter={newsletter}
          resumeScheduledAt={resumeScheduledAt}
        />
      </div>
    );
  }

  const isSent = newsletter.status === "SENT";
  const statusDate = isSent ? newsletter.sentAt : newsletter.scheduledAt;
  const hasStats =
    isSent &&
    (newsletter.deliveredCount > 0 ||
      newsletter.openedCount > 0 ||
      newsletter.clickedCount > 0 ||
      newsletter.bouncedCount > 0 ||
      newsletter.complainedCount > 0);
  const openRate =
    newsletter.deliveredCount > 0
      ? Math.round((newsletter.openedCount / newsletter.deliveredCount) * 100)
      : null;

  return (
    <div className="wrapper max-w-4xl mx-auto">
      <Link
        href="/admin/newsletter"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Newsletters
      </Link>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="min-w-0 break-words font-display text-3xl uppercase text-foreground">
          {newsletter.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sized like the sm buttons beside it so the row shares one height. */}
          <Badge variant={isSent ? "success" : "warning"} className="h-8 px-3">
            {isSent ? "Sent" : "Scheduled"}
            {statusDate && ` · ${formatDateTime(statusDate).dateTime}`}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={isCopying}
            onClick={handleStartCopy}
          >
            {isCopying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Start a copy
          </Button>
          {newsletter.resendBroadcastId && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://resend.com/broadcasts/${newsletter.resendBroadcastId}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" /> View in Resend
              </a>
            </Button>
          )}
          {newsletter.status === "SCHEDULED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRescheduleOpen(true)}
              >
                <CalendarClock className="h-4 w-4" /> Reschedule…
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setIsCancelOpen(true)}
              >
                <CalendarOff className="h-4 w-4" /> Cancel send
              </Button>
            </>
          )}
        </div>
      </div>

      {hasStats && (
        <>
          <div
            className={`mb-2 grid grid-cols-2 gap-3 ${
              // The spam tile only shows when there are complaints; give it a
              // column so it doesn't wrap onto a row of its own.
              newsletter.complainedCount > 0
                ? "sm:grid-cols-5"
                : "sm:grid-cols-4"
            }`}
          >
            {[
              {
                label: "Delivered",
                // The at-send audience size turns a bare count into a
                // deliverability check ("118 of 120"). Hidden once delivered
                // exceeds it: a scheduled send's audience can grow between
                // scheduling and sending, and "125 of 118" reads as nonsense.
                value:
                  newsletter.recipientCount &&
                  newsletter.deliveredCount <= newsletter.recipientCount
                    ? `${newsletter.deliveredCount} of ${newsletter.recipientCount}`
                    : newsletter.deliveredCount,
              },
              {
                label: "Opened",
                value:
                  openRate !== null
                    ? `${newsletter.openedCount} (${openRate}%)`
                    : newsletter.openedCount,
              },
              { label: "Clicked", value: newsletter.clickedCount },
              { label: "Bounced", value: newsletter.bouncedCount },
              // Rare enough that a permanent zero tile would just be noise.
              ...(newsletter.complainedCount > 0
                ? [
                    {
                      label: "Spam complaints",
                      value: newsletter.complainedCount,
                    },
                  ]
                : []),
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mb-6 text-xs text-muted-foreground">
            Unique recipients. Open counts are approximate, because Apple Mail
            preloads images and each preload registers as an open.
          </p>
        </>
      )}

      {topLinks.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top clicked links
            </p>
            <ul className="mt-2 space-y-1.5">
              {topLinks.map(({ link, clicks }) => (
                <li
                  key={link}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-primary hover:underline"
                    title={link}
                  >
                    {link
                      .replace(/^https?:\/\/(www\.)?/, "")
                      .replace(/\/$/, "")}
                  </a>
                  <span className="shrink-0 text-muted-foreground">
                    {clicks} {clicks === 1 ? "person" : "people"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {bounced.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bounced or complained
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {bounced.map((entry) => (
                <li
                  key={`${entry.recipient}-${entry.type}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate">{entry.recipient}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {entry.type === "email.bounced" ? "bounced" : "complained"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Often a mistyped address. Fix or remove it in{" "}
              <Link
                href="/admin/newsletter/subscribers"
                className="underline hover:text-foreground"
              >
                Subscribers
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* One frame, as tall as the email, so the page has a single scrollbar.
          allow-same-origin lets onLoad read the document's height. Scripts
          stay blocked because allow-scripts is not granted. */}
      <iframe
        title="Newsletter content"
        onLoad={(event) => {
          const frame = event.currentTarget;
          const doc = frame.contentDocument;
          if (!doc) return;
          // Collapse first: scrollHeight never reports less than the frame's
          // own height, so a short email would keep the 70vh placeholder.
          frame.style.height = "0px";
          // Add the frame's own border back, or the last 2px would scroll.
          const border = frame.offsetHeight - frame.clientHeight;
          frame.style.height = `${doc.documentElement.scrollHeight + border}px`;
        }}
        srcDoc={
          newsletter.sentHtml
            ? // The snapshot still carries the merge tags Resend resolves
              // per-recipient, so resolve them to fallbacks for display.
              resolveMergeTags(newsletter.sentHtml).replace(
                /\{\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}\}/g,
                "#",
              )
            : renderNewsletterHtml({
                contentHtml: `${resolveMergeTags(newsletter.content)}${sectionsHtml}`,
                previewText: newsletter.previewText ?? undefined,
                unsubscribeUrl: "#",
              })
        }
        className="block h-[70vh] w-full rounded-xl border bg-white shadow-sm"
        sandbox="allow-same-origin"
      />

      <BasicModal
        isOpen={isRescheduleOpen}
        onOpenChange={(open: boolean) => {
          setIsRescheduleOpen(open);
          if (!open) setRescheduleAt(undefined);
        }}
        header="Reschedule send"
        primaryAction={handleConfirmReschedule}
        primaryActionLabel={isRescheduling ? "Rescheduling…" : "Reschedule"}
        primaryActionDisabled={!rescheduleAt || isRescheduling}
        cancelLabel="Keep the current time"
      >
        <div>
          {newsletter.scheduledAt && (
            <p className="mb-4 text-sm text-muted-foreground">
              Currently scheduled for{" "}
              {formatDateTime(newsletter.scheduledAt).dateTime}.
            </p>
          )}
          <DateTimePicker
            label="New send time"
            value={rescheduleAt}
            onChange={setRescheduleAt}
            minDate={new Date()}
            maxDate={
              new Date(
                Date.now() + NEWSLETTER_SCHEDULE_MAX_DAYS * 24 * 60 * 60 * 1000,
              )
            }
            placeholder="Pick a date and time"
          />
          <p className="mt-3 text-xs text-muted-foreground">
            The event sections are rebuilt for the new send time.
          </p>
          {isRescheduling && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Rescheduling…
            </p>
          )}
        </div>
      </BasicModal>

      <BasicModal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        header="Edit scheduled newsletter"
        primaryAction={handleConfirmEdit}
        primaryActionLabel={isUnscheduling ? "Opening…" : "Edit as draft"}
        primaryActionDisabled={isUnscheduling}
        cancelLabel="Keep it scheduled"
      >
        <div>
          <p className="mb-4">
            Editing takes this newsletter out of the send queue and turns it
            back into a draft. It won&apos;t go out until you schedule it again.
          </p>
          {newsletter.scheduledAt && (
            <p className="text-sm text-muted-foreground">
              Currently scheduled for{" "}
              {formatDateTime(newsletter.scheduledAt).dateTime}. The editor
              keeps that time ready for you.
            </p>
          )}
          {isUnscheduling && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening the editor…
            </p>
          )}
        </div>
      </BasicModal>

      <BasicModal
        isOpen={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        header="Cancel scheduled send"
        primaryAction={handleConfirmCancel}
        primaryActionLabel={isCanceling ? "Canceling…" : "Cancel the send"}
        primaryActionDisabled={isCanceling}
        primaryActionVariant="destructive"
        cancelLabel="Keep it scheduled"
      >
        <div>
          <p className="mb-4">
            This pulls the newsletter out of Resend&apos;s queue and returns it
            to a draft you can edit or re-schedule.
          </p>
          <p className="font-medium">{newsletter.subject}</p>
          {newsletter.scheduledAt && (
            <p className="mt-1 text-sm text-muted-foreground">
              Currently scheduled for{" "}
              {formatDateTime(newsletter.scheduledAt).dateTime}
            </p>
          )}
          {isCanceling && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Canceling…
            </p>
          )}
        </div>
      </BasicModal>
    </div>
  );
};

export default NewsletterDetailPage;
