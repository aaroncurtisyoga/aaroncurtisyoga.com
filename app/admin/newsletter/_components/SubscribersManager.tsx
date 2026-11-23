"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import BasicModal from "@/app/_components/BasicModal";
import AddSubscriberDialog from "@/app/admin/newsletter/_components/AddSubscriberDialog";
import EditSubscriberDialog, {
  type SubscriberEdit,
} from "@/app/admin/newsletter/_components/EditSubscriberDialog";
import SubscribersTable, {
  type SubscriberSort,
  type SubscriberSortKey,
} from "@/app/admin/newsletter/_components/SubscribersTable";
import {
  deleteSubscriber,
  listSubscribers,
  updateSubscriber,
  type Subscriber,
} from "@/app/_lib/actions/newsletter.actions";
import { cn, formatDateTime } from "@/app/_lib/utils";

type StatusFilter = "all" | "subscribed" | "unsubscribed";

const PAGE_SIZE = 25;

const subscriberName = (s: Subscriber) =>
  `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();

// Ascending comparison for each sortable column. Email breaks every tie so
// the order is stable from one render to the next.
const compareBy: Record<
  SubscriberSortKey,
  (a: Subscriber, b: Subscriber) => number
> = {
  email: (a, b) => a.email.localeCompare(b.email),
  name: (a, b) => subscriberName(a).localeCompare(subscriberName(b)),
  // Subscribed first when ascending
  status: (a, b) => Number(a.unsubscribed) - Number(b.unsubscribed),
  added: (a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
};

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

// Subscribers type these values themselves. A cell starting with = + - or @
// runs as a formula when the export is opened in Excel or Sheets, so those
// get a leading apostrophe, which spreadsheets show as plain text.
const csvCell = (value: string) => {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const SubscribersManager: FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  // "Now" is impure, so it's captured once per load (in applyResult) and the
  // growth stat derives from it + the live subscribers array — that way local
  // edits (deleting someone) update the stat like the other cards.
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  // null keeps the order Resend returns the list in
  const [sort, setSort] = useState<SubscriberSort | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState<Subscriber | null>(null);

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof listSubscribers>>) => {
      if (!result.status) {
        setLoadError(result.message ?? "Failed to load subscribers.");
        setSubscribers([]);
        setCapped(false);
        setLoadedAt(null);
      } else {
        setLoadError(null);
        setSubscribers(result.subscribers);
        setCapped(result.capped);
        setLoadedAt(Date.now());
      }
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      const result = await listSubscribers();
      if (active) applyResult(result);
    };
    run();
    return () => {
      active = false;
    };
  }, [applyResult]);

  // Refetch triggered by a user action (add, retry) — show the spinner again.
  const refresh = useCallback(async () => {
    setIsLoading(true);
    applyResult(await listSubscribers());
  }, [applyResult]);

  // Filters reset pagination from the handlers below (not an effect) so we
  // never chain setState off a render.
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  // First click sorts a column, a second click flips it. "Added" starts
  // newest first, since that's the question it usually answers.
  const handleSort = (key: SubscriberSortKey) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "added" ? "desc" : "asc" },
    );
    setPage(1);
  };

  const stats = useMemo(() => {
    const subscribed = subscribers.filter((s) => !s.unsubscribed).length;
    return {
      total: subscribers.length,
      subscribed,
      unsubscribed: subscribers.length - subscribed,
    };
  }, [subscribers]);

  // List growth is the slowest but most honest signal that the newsletter
  // (and the classes it promotes) are landing.
  const newLast30 = useMemo(() => {
    if (loadedAt === null) return 0;
    return subscribers.filter(
      (s) => loadedAt - new Date(s.createdAt).getTime() <= 30 * DAY_MS,
    ).length;
  }, [subscribers, loadedAt]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (statusFilter === "subscribed" && s.unsubscribed) return false;
      if (statusFilter === "unsubscribed" && !s.unsubscribed) return false;
      if (!query) return true;
      const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase();
      return s.email.toLowerCase().includes(query) || name.includes(query);
    });
  }, [subscribers, search, statusFilter]);

  // Sorted before paging, so a sort reorders the whole list and not just the
  // 25 rows on screen.
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const flip = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      // People with no name go last in either direction
      if (sort.key === "name") {
        const aBlank = !subscriberName(a);
        const bBlank = !subscriberName(b);
        if (aBlank !== bBlank) return aBlank ? 1 : -1;
      }
      return compareBy[sort.key](a, b) * flip || a.email.localeCompare(b.email);
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  const patchSubscriber = (id: string, patch: Partial<Subscriber>) =>
    setSubscribers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  const handleToggle = async (subscriber: Subscriber) => {
    const nextUnsubscribed = !subscriber.unsubscribed;
    setBusyId(subscriber.id);
    const result = await updateSubscriber({
      id: subscriber.id,
      unsubscribed: nextUnsubscribed,
    });
    setBusyId(null);
    if (!result.status) {
      toast.error(result.message);
      return;
    }
    patchSubscriber(subscriber.id, { unsubscribed: nextUnsubscribed });
    toast.success(nextUnsubscribed ? "Unsubscribed" : "Resubscribed");
  };

  const handleSaveEdit = async (edit: SubscriberEdit): Promise<boolean> => {
    if (!editing) return false;
    const result = await updateSubscriber({ id: editing.id, ...edit });
    if (!result.status) {
      toast.error(result.message);
      return false;
    }
    patchSubscriber(editing.id, {
      firstName: edit.firstName.trim() || null,
      lastName: edit.lastName.trim() || null,
      unsubscribed: edit.unsubscribed,
    });
    toast.success("Subscriber updated");
    return true;
  };

  const handleConfirmDelete = async () => {
    // Guard against a double-click while the removal is in flight — otherwise
    // the second call hits an already-deleted id and shows a contradictory error.
    if (!deleting || busyId === deleting.id) return;
    setBusyId(deleting.id);
    const result = await deleteSubscriber(deleting.id);
    setBusyId(null);
    if (!result.status) {
      toast.error(result.message);
      return;
    }
    setSubscribers((prev) => prev.filter((s) => s.id !== deleting.id));
    toast.success("Subscriber removed");
    setDeleting(null);
  };

  const handleExport = () => {
    if (subscribers.length === 0) {
      toast.info("No subscribers to export yet.");
      return;
    }
    const header = ["Email", "First name", "Last name", "Status", "Date added"];
    const rows = subscribers.map((s) => [
      s.email,
      s.firstName ?? "",
      s.lastName ?? "",
      s.unsubscribed ? "Unsubscribed" : "Subscribed",
      formatDateTime(s.createdAt).dateOnly,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Stamp the filename in ET so it matches the "Date added" column, which the
    // app renders in America/New_York everywhere.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
    }).format(new Date());
    link.download = `subscribers-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Subscribed", value: stats.subscribed },
          { label: "Unsubscribed", value: stats.unsubscribed },
          { label: "New (30 days)", value: newLast30 },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-3xl text-foreground">
              {isLoading ? "—" : stat.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardContent className="space-y-4 pt-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:max-w-xs sm:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search email or name"
                  className="pl-9"
                  aria-label="Search subscribers"
                />
              </div>
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                {statusFilters.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusFilter(option.value)}
                    aria-pressed={statusFilter === option.value}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      statusFilter === option.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="font-medium"
                onClick={handleExport}
                disabled={isLoading || subscribers.length === 0}
              >
                <Download className="h-4 w-4" /> Export
              </Button>
              <AddSubscriberDialog onAdded={refresh} />
            </div>
          </div>

          {capped && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Showing the first {subscribers.length} subscribers. Your list is
              larger than this view can load.
            </div>
          )}

          {/* Body */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : loadError ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>{loadError}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                Try again
              </Button>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/60" />
              <p>No subscribers yet. Add someone to get started.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {search.trim()
                ? "No subscribers match your search."
                : statusFilter === "unsubscribed"
                  ? "No one has unsubscribed."
                  : statusFilter === "subscribed"
                    ? "No active subscribers right now."
                    : "No subscribers match your filters."}
            </div>
          ) : (
            <>
              <SubscribersTable
                subscribers={paged}
                busyId={busyId}
                sort={sort}
                onSort={handleSort}
                onEdit={setEditing}
                onToggle={handleToggle}
                onDelete={setDeleting}
              />

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Showing {pageStart + 1}–
                  {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() =>
                        setPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EditSubscriberDialog
        subscriber={editing}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
      />

      <BasicModal
        isOpen={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        header="Remove subscriber"
        primaryAction={handleConfirmDelete}
        primaryActionLabel="Remove"
      >
        {deleting && (
          <div>
            <p className="mb-4">
              Remove this subscriber from your list? This permanently deletes
              them from Resend and can&apos;t be undone.
            </p>
            <p className="font-medium">{deleting.email}</p>
          </div>
        )}
      </BasicModal>
    </div>
  );
};

export default SubscribersManager;
