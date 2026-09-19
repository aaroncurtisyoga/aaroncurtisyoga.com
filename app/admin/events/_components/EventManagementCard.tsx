"use client";

import { FC } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
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
import AdminCard from "@/app/admin/_components/AdminCard";
import { formatDateTime } from "@/app/_lib/utils";

interface EventManagementCardProps {
  event: any;
  onDeleteClick: (event: any) => void;
  onToggleFeatured: (eventId: string, next: boolean) => void;
}

const EventManagementCard: FC<EventManagementCardProps> = ({
  event,
  onDeleteClick,
  onToggleFeatured,
}) => {
  return (
    <AdminCard>
      <div className="space-y-3">
        {/* Header: Title + External badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <p className="font-medium text-base truncate">{event.title}</p>
            {event.isExternal && (
              <SimpleTooltip content="Synced from external source">
                <span role="img" aria-label="Synced from external source">
                  <ExternalLink
                    size={14}
                    className="text-muted-foreground mt-0.5 flex-shrink-0"
                  />
                </span>
              </SimpleTooltip>
            )}
          </div>
          <Badge variant="info" className="flex-shrink-0">
            {event.category.name}
          </Badge>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="font-medium">
            {formatDateTime(event.startDateTime).dateOnly}
          </span>
          <span className="text-muted-foreground">at</span>
          <span className="text-muted-foreground">
            {formatDateTime(event.startDateTime).timeOnly}
          </span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-muted-foreground" />
            <p className="text-muted-foreground truncate">
              {event.location.name || event.location.formattedAddress}
            </p>
          </div>
        )}

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={event.isActive ? "success" : "secondary"}>
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

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-border">
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
              onClick={() => onToggleFeatured(event.id, !event.isFeatured)}
            >
              <Star
                size={18}
                className={
                  event.isFeatured ? "fill-primary text-primary" : undefined
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
      </div>
    </AdminCard>
  );
};

export default EventManagementCard;
