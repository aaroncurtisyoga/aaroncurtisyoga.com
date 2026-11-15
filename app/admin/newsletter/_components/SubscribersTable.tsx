"use client";

import { FC } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Subscriber } from "@/app/_lib/actions/newsletter.actions";
import { cn, formatDateTime } from "@/app/_lib/utils";

export type SubscriberSortKey = "email" | "name" | "status" | "added";

export interface SubscriberSort {
  key: SubscriberSortKey;
  direction: "asc" | "desc";
}

const sortableColumns: { key: SubscriberSortKey; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
  { key: "added", label: "Added" },
];

interface SubscribersTableProps {
  subscribers: Subscriber[];
  busyId: string | null;
  /** The active sort, or null for the list's own order. */
  sort: SubscriberSort | null;
  onSort: (key: SubscriberSortKey) => void;
  onEdit: (subscriber: Subscriber) => void;
  onToggle: (subscriber: Subscriber) => void;
  onDelete: (subscriber: Subscriber) => void;
}

const fullName = (subscriber: Subscriber) =>
  `${subscriber.firstName ?? ""} ${subscriber.lastName ?? ""}`.trim();

const SubscribersTable: FC<SubscribersTableProps> = ({
  subscribers,
  busyId,
  sort,
  onSort,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied");
    } catch {
      toast.error("Couldn't copy the email");
    }
  };

  const rowMenu = (subscriber: Subscriber) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={busyId === subscriber.id}
          aria-label={`Actions for ${subscriber.email}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit(subscriber)}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle(subscriber)}>
          {subscriber.unsubscribed ? (
            <>
              <UserCheck className="h-4 w-4" /> Resubscribe
            </>
          ) : (
            <>
              <UserMinus className="h-4 w-4" /> Unsubscribe
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyEmail(subscriber.email)}>
          <Copy className="h-4 w-4" /> Copy email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(subscriber)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const statusBadge = (subscriber: Subscriber) => (
    <Badge variant={subscriber.unsubscribed ? "secondary" : "success"}>
      {subscriber.unsubscribed ? "Unsubscribed" : "Subscribed"}
    </Badge>
  );

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {subscribers.map((subscriber) => (
          <div
            key={subscriber.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {subscriber.email}
                </p>
                {fullName(subscriber) && (
                  <p className="truncate text-sm text-muted-foreground">
                    {fullName(subscriber)}
                  </p>
                )}
              </div>
              {rowMenu(subscriber)}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {statusBadge(subscriber)}
              <span className="text-xs text-muted-foreground">
                Added {formatDateTime(subscriber.createdAt).dateOnly}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table aria-label="Newsletter subscribers">
          <TableHeader>
            <TableRow>
              {sortableColumns.map(({ key, label }) => {
                const active = sort?.key === key;
                const Icon = !active
                  ? ArrowUpDown
                  : sort.direction === "asc"
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <TableHead
                    key={key}
                    aria-sort={
                      !active
                        ? "none"
                        : sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onSort(key)}
                      className={cn(
                        "-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        active && "text-foreground",
                      )}
                    >
                      {label}
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          !active && "text-muted-foreground/60",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell className="max-w-md truncate font-medium">
                  {subscriber.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fullName(subscriber) || "—"}
                </TableCell>
                <TableCell>{statusBadge(subscriber)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(subscriber.createdAt).dateOnly}
                </TableCell>
                <TableCell className="text-right">
                  {rowMenu(subscriber)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default SubscribersTable;
