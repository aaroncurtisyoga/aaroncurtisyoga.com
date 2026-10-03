"use client";

import * as React from "react";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/app/_lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Every date on the site is shown in Eastern time (see formatDateTime), so the
// picker reads and writes Eastern wall-clock time too, whatever zone the
// browser is in. 8:00 PM here always means 8:00 PM in New York.
const TIME_ZONE = "America/New_York";

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  error?: string;
  required?: boolean;
  granularity?: "day" | "minute";
}

/** The instant for a wall-clock time in Eastern on `day`'s Eastern date. */
const easternInstant = (day: Date, hours: number, minutes: number): Date => {
  const d = new TZDate(day, TIME_ZONE);
  const zoned = new TZDate(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hours,
    minutes,
    TIME_ZONE,
  );
  // Hand the form a plain Date, not the TZDate subclass
  return new Date(zoned.getTime());
};

export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  disabled,
  minDate,
  maxDate,
  className,
  error,
  required,
  granularity = "minute",
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const withTime = granularity === "minute";

  // TZDate's getters, and date-fns format, read the Eastern fields. An invalid
  // Date (say, from a bad saved draft) shows as empty rather than throwing.
  const eastern =
    value && !Number.isNaN(value.getTime())
      ? new TZDate(value, TIME_ZONE)
      : undefined;

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      onChange?.(undefined);
      return;
    }
    // Keep the time already set when moving to another day
    onChange?.(
      easternInstant(
        day,
        eastern ? eastern.getHours() : 12,
        eastern ? eastern.getMinutes() : 0,
      ),
    );
    // With no time to set, picking the day is the whole job.
    if (!withTime) setOpen(false);
  };

  // A native time input reports "HH:mm" (sometimes with seconds), or "" while
  // a segment is still blank mid-typing. Ignore anything incomplete: an empty
  // string would otherwise become an Invalid Date and crash the form.
  const handleTimeChange = (time: string) => {
    const match = /^(\d{2}):(\d{2})/.exec(time);
    if (!match) return;
    onChange?.(easternInstant(eastern ?? new Date(), +match[1], +match[2]));
  };

  const displayValue = eastern
    ? withTime
      ? `${format(eastern, "MMM d, yyyy h:mm a")} ET`
      : format(eastern, "MMM d, yyyy")
    : undefined;

  // Compared by Eastern calendar day, so a minDate of "now" still leaves
  // today selectable.
  const disabledDays = [
    ...(minDate ? [{ before: new TZDate(minDate, TIME_ZONE) }] : []),
    ...(maxDate ? [{ after: new TZDate(maxDate, TIME_ZONE) }] : []),
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full justify-start text-left font-normal",
              !eastern && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue ?? <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            timeZone={TIME_ZONE}
            selected={eastern}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            defaultMonth={eastern}
            autoFocus
          />
          {withTime && (
            <div className="flex items-center justify-between gap-3 border-t p-3">
              <Label htmlFor={`${id}-time`} className="text-muted-foreground">
                Time (ET)
              </Label>
              <Input
                id={`${id}-time`}
                type="time"
                value={eastern ? format(eastern, "HH:mm") : "12:00"}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="h-8 w-auto"
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
