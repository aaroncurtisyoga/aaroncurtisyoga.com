"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Newsletter } from "@prisma/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { CalendarOff, Copy, Pencil, Eye, Trash2 } from "lucide-react";
import BasicModal from "@/app/_components/BasicModal";
import { useDisclosure } from "@/app/_hooks/useDisclosure";
import {
  cancelScheduledNewsletter,
  deleteNewsletter,
  duplicateNewsletter,
} from "@/app/_lib/actions/newsletter.actions";
import { formatDateTime } from "@/app/_lib/utils";

const statusVariants: Record<
  Newsletter["status"],
  "secondary" | "warning" | "success"
> = {
  DRAFT: "secondary",
  SCHEDULED: "warning",
  SENT: "success",
};

const statusLabels: Record<Newsletter["status"], string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENT: "Sent",
};

interface NewsletterTableProps {
  newsletters: Newsletter[];
  onChanged: () => Promise<void>;
}

const NewsletterTable: FC<NewsletterTableProps> = ({
  newsletters,
  onChanged,
}) => {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [newsletterToDelete, setNewsletterToDelete] =
    useState<Newsletter | null>(null);
  const [newsletterToCancel, setNewsletterToCancel] =
    useState<Newsletter | null>(null);

  const describeDate = (newsletter: Newsletter) => {
    if (newsletter.status === "SENT" && newsletter.sentAt) {
      const { dateOnly, timeOnly } = formatDateTime(newsletter.sentAt);
      return `Sent ${dateOnly} · ${timeOnly}`;
    }
    if (newsletter.status === "SCHEDULED" && newsletter.scheduledAt) {
      const { dateOnly, timeOnly } = formatDateTime(newsletter.scheduledAt);
      return `Sends ${dateOnly} · ${timeOnly}`;
    }
    const { dateOnly } = formatDateTime(newsletter.updatedAt);
    return `Edited ${dateOnly}`;
  };

  const describePerformance = (newsletter: Newsletter) => {
    if (newsletter.status !== "SENT") return null;
    const hasData =
      newsletter.deliveredCount > 0 ||
      newsletter.openedCount > 0 ||
      newsletter.clickedCount > 0 ||
      newsletter.bouncedCount > 0;
    // Older sends predate the webhook; zeros there mean "no data", not "0 opens"
    if (!hasData) return null;
    // Rates are comparable across sends as the list grows; raw counts move
    // to the tooltip.
    if (newsletter.deliveredCount > 0) {
      const open = Math.round(
        (newsletter.openedCount / newsletter.deliveredCount) * 100,
      );
      const click = Math.round(
        (newsletter.clickedCount / newsletter.deliveredCount) * 100,
      );
      return `${open}% opened · ${click}% clicked`;
    }
    return `${newsletter.openedCount} opened · ${newsletter.clickedCount} clicked`;
  };

  const describeTooltip = (newsletter: Newsletter) => {
    // Denominator only while it still makes sense — a scheduled send's
    // audience can outgrow the count captured at scheduling time.
    const delivered =
      newsletter.recipientCount &&
      newsletter.deliveredCount <= newsletter.recipientCount
        ? `Delivered ${newsletter.deliveredCount} of ${newsletter.recipientCount}`
        : `Delivered ${newsletter.deliveredCount}`;
    const complained =
      newsletter.complainedCount > 0
        ? ` · Spam complaints ${newsletter.complainedCount}`
        : "";
    return `${delivered} · Opened ${newsletter.openedCount} · Clicked ${newsletter.clickedCount} · Bounced ${newsletter.bouncedCount}${complained}. Opens are approximate — Apple Mail preloads images.`;
  };

  // "Was this send better than my usual?" needs a baseline: mean open/click
  // rate over the most recent sends that have data.
  const recentAverage = (() => {
    const withData = newsletters
      .filter((n) => n.status === "SENT" && n.deliveredCount > 0)
      .sort((a, b) =>
        (b.sentAt ? new Date(b.sentAt).getTime() : 0) >
        (a.sentAt ? new Date(a.sentAt).getTime() : 0)
          ? 1
          : -1,
      )
      .slice(0, 10);
    if (withData.length < 2) return null;
    const mean = (fn: (n: Newsletter) => number) =>
      Math.round(
        (withData.reduce((sum, n) => sum + fn(n) / n.deliveredCount, 0) /
          withData.length) *
          100,
      );
    return {
      count: withData.length,
      open: mean((n) => n.openedCount),
      click: mean((n) => n.clickedCount),
    };
  })();

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    // Stays busy through a successful navigation — re-enabling during the
    // route transition invites a double-click and a stray second "(copy)".
    let navigating = false;
    try {
      const result = await duplicateNewsletter(id);
      if (result.status && result.data) {
        // Straight into the copy — hunting for the "(copy)" row in the list
        // was the slowest step of the reuse loop.
        navigating = true;
        toast.success("Draft duplicated");
        router.push(`/admin/newsletter/${result.data.id}`);
      } else {
        toast.error(result.message);
        await onChanged();
      }
    } finally {
      if (!navigating) setBusyId(null);
    }
  };

  const handleDeleteClick = (newsletter: Newsletter) => {
    setNewsletterToDelete(newsletter);
    onOpen();
  };

  const handleConfirmDelete = async () => {
    if (!newsletterToDelete) return;
    setBusyId(newsletterToDelete.id);
    try {
      const result = await deleteNewsletter(newsletterToDelete.id);
      if (result.status) {
        toast.success("Newsletter deleted");
        onOpenChange(false);
        setNewsletterToDelete(null);
        await onChanged();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!newsletterToCancel) return;
    setBusyId(newsletterToCancel.id);
    try {
      const result = await cancelScheduledNewsletter(newsletterToCancel.id);
      if (result.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setNewsletterToCancel(null);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {recentAverage && (
        <p className="mb-3 text-xs text-muted-foreground">
          Average of your last {recentAverage.count} sends: {recentAverage.open}
          % opened · {recentAverage.click}% clicked
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Performance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {newsletters.map((newsletter) => {
            const performance = describePerformance(newsletter);
            return (
              <TableRow key={newsletter.id}>
                <TableCell className="font-medium max-w-xl truncate">
                  <Link
                    href={`/admin/newsletter/${newsletter.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {newsletter.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[newsletter.status]}>
                    {statusLabels[newsletter.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {describeDate(newsletter)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {performance ? (
                    <SimpleTooltip content={describeTooltip(newsletter)}>
                      <span>{performance}</span>
                    </SimpleTooltip>
                  ) : (
                    <span>
                      <span aria-hidden>—</span>
                      <span className="sr-only">No data yet</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <SimpleTooltip
                      content={newsletter.status === "DRAFT" ? "Edit" : "View"}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        asChild
                      >
                        <Link href={`/admin/newsletter/${newsletter.id}`}>
                          {newsletter.status === "DRAFT" ? (
                            <Pencil className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Link>
                      </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content="Duplicate">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={busyId === newsletter.id}
                        onClick={() => handleDuplicate(newsletter.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </SimpleTooltip>
                    {newsletter.status === "SCHEDULED" && (
                      <SimpleTooltip content="Cancel send">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={busyId === newsletter.id}
                          onClick={() => setNewsletterToCancel(newsletter)}
                        >
                          <CalendarOff className="h-4 w-4" />
                        </Button>
                      </SimpleTooltip>
                    )}
                    {newsletter.status !== "SCHEDULED" && (
                      <SimpleTooltip content="Delete">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={busyId === newsletter.id}
                          onClick={() => handleDeleteClick(newsletter)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </SimpleTooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <BasicModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        header="Delete newsletter"
        primaryAction={handleConfirmDelete}
        primaryActionLabel="Delete"
        primaryActionDisabled={busyId === newsletterToDelete?.id}
      >
        {newsletterToDelete && (
          <div>
            <p className="mb-4">
              Are you sure you want to delete this newsletter? This can&apos;t
              be undone.
            </p>
            <p className="font-medium">{newsletterToDelete.subject}</p>
          </div>
        )}
      </BasicModal>

      <BasicModal
        isOpen={newsletterToCancel !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setNewsletterToCancel(null);
        }}
        header="Cancel scheduled send"
        primaryAction={handleConfirmCancel}
        primaryActionLabel={
          busyId === newsletterToCancel?.id ? "Cancelling…" : "Cancel the send"
        }
        primaryActionDisabled={busyId === newsletterToCancel?.id}
        cancelLabel="Keep it scheduled"
      >
        {newsletterToCancel && (
          <div>
            <p className="mb-4">
              This pulls the newsletter out of Resend&apos;s queue and returns
              it to a draft you can edit or re-schedule.
            </p>
            <p className="font-medium">{newsletterToCancel.subject}</p>
            {newsletterToCancel.scheduledAt && (
              <p className="mt-1 text-sm text-muted-foreground">
                Currently scheduled for{" "}
                {formatDateTime(newsletterToCancel.scheduledAt).dateTime}
              </p>
            )}
          </div>
        )}
      </BasicModal>
    </>
  );
};

export default NewsletterTable;
