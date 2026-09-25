"use client";

import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Calendar, Check } from "lucide-react";

interface AddToCalendarButtonsProps {
  event: {
    title: string;
    description?: string | null;
    startDateTime: Date | string;
    endDateTime: Date | string;
    location?: {
      formattedAddress?: string | null;
      name?: string | null;
    } | null;
  };
}

const AddToCalendarButtons: FC<AddToCalendarButtonsProps> = ({ event }) => {
  const [addedToCalendar, setAddedToCalendar] = useState(false);

  const generateCalendarLinks = () => {
    const startDate = new Date(event.startDateTime);
    const endDate = new Date(event.endDateTime);
    const location =
      event.location?.formattedAddress || event.location?.name || "";

    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
    const formatGoogleDate = (date: Date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    };

    // Google Calendar link
    const googleParams = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: event.description || "",
      location: location,
    });
    const googleCalendarLink = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

    // Outlook/Office 365 link
    const outlookParams = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: event.title,
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      body: event.description || "",
      location: location,
    });
    const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

    // Apple Calendar (using data URI with .ics file)
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${formatGoogleDate(startDate)}`,
      `DTEND:${formatGoogleDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description?.replace(/\n/g, "\\n") || ""}`,
      `LOCATION:${location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    return {
      google: googleCalendarLink,
      outlook: outlookLink,
      apple: `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`,
    };
  };

  const handleAddToCalendar = (type: "google" | "outlook" | "apple") => {
    const links = generateCalendarLinks();
    console.log(
      `[Add to Calendar] Opening ${type} calendar link for event:`,
      event.title,
    );

    if (type === "apple") {
      // For Apple Calendar, create a downloadable .ics file
      const element = document.createElement("a");
      element.setAttribute("href", links[type]);
      element.setAttribute(
        "download",
        `${event.title.replace(/\s+/g, "_")}.ics`,
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      window.open(links[type], "_blank");
    }

    setAddedToCalendar(true);
    setTimeout(() => setAddedToCalendar(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-line bg-transparent text-ink hover:bg-sand-deep hover:text-ink"
        >
          {addedToCalendar ? <Check size={18} /> : <Calendar size={18} />}
          {addedToCalendar ? "Added!" : "Add to Calendar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => handleAddToCalendar("google")}>
          <div>
            <div>Google Calendar</div>
            <div className="text-xs text-muted-foreground">
              Add to Google Calendar
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar("outlook")}>
          <div>
            <div>Outlook Calendar</div>
            <div className="text-xs text-muted-foreground">
              Add to Outlook/Office 365
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar("apple")}>
          <div>
            <div>Apple Calendar</div>
            <div className="text-xs text-muted-foreground">
              Download .ics file for Apple Calendar
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddToCalendarButtons;
