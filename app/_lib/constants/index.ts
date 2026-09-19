import {
  Bike,
  Boxes,
  Calendar,
  Car,
  Footprints,
  LayoutDashboard,
  Mail,
  ShoppingBag,
  TramFront,
  UsersRound,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { OrderType } from "@prisma/client";
import { TravelOption } from "@/app/_lib/types";

// Homepage sections. The homepage nav renders these as written; the shared
// Header on every other public page lowercases them, so both navs stay in sync.
export const unauthenticatedLinks = [
  { name: "Classes", href: "/#classes", testId: "classes-link" },
  { name: "About", href: "/#about", testId: "about-link" },
  { name: "Newsletter", href: "/#newsletter", testId: "newsletter-link" },
];

// The admin's way back into the dashboard. UserDropdown renders it, and both
// navs (the homepage one and the shared Header) pass it the same list.
export const adminDashboardLinks = [
  { href: "/admin", name: "Admin Dashboard", testId: "admin-dashboard-link" },
];

export const travelOptions: TravelOption[] = [
  {
    travelMode: "driving",
    icon: Car,
  },
  {
    travelMode: "walking",
    icon: Footprints,
  },
  {
    travelMode: "transit",
    icon: TramFront,
  },
  {
    travelMode: "bicycling",
    icon: Bike,
  },
];

export const instructorEmailAddress = "hi@aaroncurtisyoga.com";

export const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/aaroncurtisyoga/",
    testId: "footer-instagram-link",
    ariaLabel: "Follow Aaron on Instagram",
    trackAction: "instagram_click",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UCwwNWri2IhKxXKmQkCpj-uw",
    testId: "footer-youtube-link",
    ariaLabel: "Visit Aaron on YouTube",
    trackAction: "youtube_click",
  },
  {
    name: "Spotify",
    href: "https://open.spotify.com/user/31fmmphtelatfs7ra4tvboorm4qy?si=c32d094ea2c84e08",
    testId: "footer-spotify-link",
    ariaLabel: "See Aaron's playlists on Spotify",
    trackAction: "spotify_click",
  },
];

export const adminNavLinks = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Events", path: "/admin/events", icon: Calendar },
  { name: "Orders", path: "/admin/events/orders", icon: ShoppingBag },
  { name: "Categories", path: "/admin/categories", icon: Boxes },
  { name: "Users", path: "/admin/users", icon: UsersRound },
  { name: "Newsletter", path: "/admin/newsletter", icon: Mail },
  { name: "Sync Events", path: "/admin/sync", icon: RefreshCw },
];

// Rendered apart from the admin sections — it leaves the admin area entirely.
export const mainSiteLink = {
  name: "Back to site",
  path: "/",
  icon: ExternalLink,
};

export const TableEventManagementColumns = [
  "Date & Time",
  "Event Details",
  "Category",
  "Status",
  "Actions",
];

export const TableManageUsersColumns = [
  "First Name",
  "Last Name",
  "Email",
  "UID",
  "Actions",
];

export const EventHistoryTableColumns = [
  "Date",
  "Amount",
  "Event",
  "Order ID",
  "Type",
];

// Typed against the Prisma OrderType enum so adding a new order type is a
// compile error here (a missing label) rather than an `undefined` at render.
export const orderTypeLabels: Record<OrderType, string> = {
  EVENT: "Event",
  PRIVATE_SESSION: "Private Session",
};

/**
 * Canonical `Event.sourceType` values for synced events. `sourceType` is a
 * plain String column (only two sources today, so deliberately not a Prisma
 * enum), so this const is the single source of truth shared by the sync
 * services and the sync-status route. Add a member here when wiring a new
 * sync source.
 */
export const SOURCE_TYPES = {
  BRIGHT_BEAR: "MOMENCE",
  DCBP: "ZOOMSHIFT",
} as const;

export type SourceType = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];
