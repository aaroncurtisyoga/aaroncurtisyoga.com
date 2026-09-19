"use client";

import { FC, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useDisclosure } from "@/app/_hooks/useDisclosure";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Star,
} from "lucide-react";
import BasicModal from "@/app/_components/BasicModal";
import TableEmpty from "@/app/_components/TableEmpty";
import TableLoading from "@/app/_components/TableLoading";
import EventTableToolbar from "@/app/admin/events/_components/EventTableToolbar";
import EventManagementCard from "@/app/admin/events/_components/EventManagementCard";
import { useEventTableFilters } from "@/app/admin/events/_components/hooks/useEventTableFilters";
import { useEventTableData } from "@/app/admin/events/_components/hooks/useEventTableData";
import { TableEventManagementColumns } from "@/app/_lib/constants";
import { formatDateTime } from "@/app/_lib/utils";

const TableEventManagement: FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const {
    filters,
    hasActiveFilters,
    handleSearchChange,
    handleCategoryChange,
    handleStatusChange,
    handlePageChange,
    clearFilters,
  } = useEventTableFilters();

  const {
    events,
    categories,
    totalPages,
    totalCount,
    loading,
    handleDeleteEvent,
    handleToggleFeatured,
  } = useEventTableData(filters);

  const onDeleteClick = (event: any) => {
    setSelectedEvent(event);
    onOpen();
  };

  const onConfirmDelete = async () => {
    if (!selectedEvent) return;
    const success = await handleDeleteEvent(selectedEvent.id);
    if (success) {
      onOpenChange();
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (filters.page > 3) pages.push("ellipsis");
      for (
        let i = Math.max(2, filters.page - 1);
        i <= Math.min(totalPages - 1, filters.page + 1);
        i++
      ) {
        pages.push(i);
      }
      if (filters.page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <EventTableToolbar
          searchText=""
          category=""
          statusFilter="all"
          categories={[]}
          hasActiveFilters={false}
          disabled={true}
          onSearchChange={() => {}}
          onCategoryChange={() => {}}
          onStatusChange={() => {}}
          onClearFilters={() => {}}
        />
        <TableLoading columns={TableEventManagementColumns} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EventTableToolbar
        searchText={filters.searchText}
        category={filters.category}
        statusFilter={filters.statusFilter}
        categories={categories}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
      />

      <div className="flex justify-between items-center">
        <p className="text-muted-foreground text-sm">
          {totalCount} {totalCount === 1 ? "event" : "events"} found
          {hasActiveFilters && " (filtered)"}
        </p>
      </div>

      {events.length === 0 ? (
        <TableEmpty
          columns={TableEventManagementColumns}
          message={
            hasActiveFilters
              ? "No events found matching your filters"
              : "No events have been created yet"
          }
        />
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {events.map((event) => (
              <EventManagementCard
                key={event.id}
                event={event}
                onDeleteClick={onDeleteClick}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block">
            <Table aria-label="Table for Managing Events">
              <TableHeader>
                <TableRow>
                  {TableEventManagementColumns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar
                            size={14}
                            className="text-muted-foreground"
                          />
                          <span className="font-medium">
                            {formatDateTime(event.startDateTime).dateOnly}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(event.startDateTime).timeOnly}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <p className="font-medium">{event.title}</p>
                          {event.isExternal && (
                            <SimpleTooltip content="Synced from external source">
                              <span
                                role="img"
                                aria-label="Synced from external source"
                              >
                                <ExternalLink
                                  size={14}
                                  className="text-muted-foreground mt-0.5"
                                />
                              </span>
                            </SimpleTooltip>
                          )}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin
                              size={12}
                              className="text-muted-foreground"
                            />
                            <p className="text-xs text-muted-foreground">
                              {event.location.name ||
                                event.location.formattedAddress}
                            </p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{event.category.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={event.isActive ? "success" : "secondary"}
                        >
                          {event.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {event.isFree ? (
                          <Badge variant="success">Free</Badge>
                        ) : (
                          event.price && (
                            <Badge variant="secondary">
                              <DollarSign size={12} className="mr-1" />
                              {event.price}
                            </Badge>
                          )
                        )}
                        {event.maxAttendees && (
                          <Badge variant="secondary">
                            <Users size={12} className="mr-1" />
                            {event.maxAttendees}
                          </Badge>
                        )}
                        {event.isFeatured && (
                          <Badge variant="info">
                            <Star size={12} className="mr-1 fill-primary" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <SimpleTooltip
                          content={
                            event.isFeatured
                              ? "Remove from the newsletter"
                              : "Feature in the newsletter"
                          }
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={
                              event.isFeatured
                                ? "Remove from the newsletter"
                                : "Feature in the newsletter"
                            }
                            aria-pressed={event.isFeatured}
                            onClick={() =>
                              handleToggleFeatured(event.id, !event.isFeatured)
                            }
                          >
                            <Star
                              size={18}
                              className={
                                event.isFeatured
                                  ? "fill-primary text-primary"
                                  : undefined
                              }
                            />
                          </Button>
                        </SimpleTooltip>
                        {!event.isExternal && (
                          <SimpleTooltip content="View">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label="View event"
                              asChild
                            >
                              <Link href={`/events/${event.id}`}>
                                <Eye size={18} />
                              </Link>
                            </Button>
                          </SimpleTooltip>
                        )}
                        <SimpleTooltip content="Edit">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary hover:text-primary"
                            aria-label="Edit event"
                            asChild
                          >
                            <Link href={`/admin/events/${event.id}/edit`}>
                              <Pencil size={18} />
                            </Link>
                          </Button>
                        </SimpleTooltip>
                        <SimpleTooltip content="Delete">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label="Delete event"
                            onClick={() => onDeleteClick(event)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </SimpleTooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination aria-label="Events pagination">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    handlePageChange(Math.max(1, filters.page - 1))
                  }
                  className={
                    filters.page <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {getPageNumbers().map((page, index) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={filters.page === page}
                      onClick={() => handlePageChange(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, filters.page + 1))
                  }
                  className={
                    filters.page >= totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <BasicModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        header={<h1>Confirm deletion for this event</h1>}
        primaryAction={onConfirmDelete}
        primaryActionLabel="Delete"
      >
        {selectedEvent && (
          <div>
            <p className="mb-5">Are you sure you want to delete this event?</p>
            <p>
              <b>Event:</b> {selectedEvent.title}
            </p>
            <p>
              <b>Category:</b> {selectedEvent.category.name}
            </p>
            <p>
              <b>Date:</b>{" "}
              {formatDateTime(selectedEvent.startDateTime).dateTime}
            </p>
          </div>
        )}
      </BasicModal>
    </div>
  );
};

export default TableEventManagement;
