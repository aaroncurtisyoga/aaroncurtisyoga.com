import Link from "next/link";
import {
  Boxes,
  Calendar,
  CalendarClock,
  Mail,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import AdminPage from "@/app/admin/_components/AdminPage";
import prisma from "@/app/_lib/prisma";
import { requireAdmin } from "@/app/_lib/auth";
import { getSubscriberCount } from "@/app/_lib/actions/newsletter.actions";

type Stat = number | string | null;

async function getStats() {
  // proxy.ts gates the route, but this reads user and order counts, so it
  // checks for itself rather than trusting the middleware.
  await requireAdmin();

  const now = new Date();
  const [events, upcoming, orders, users, categories, subscriberData] =
    await Promise.all([
      prisma.event.count().catch(() => null),
      prisma.event
        .count({ where: { isActive: true, startDateTime: { gte: now } } })
        .catch(() => null),
      prisma.order.count().catch(() => null),
      prisma.user.count().catch(() => null),
      prisma.category.count().catch(() => null),
      getSubscriberCount().catch(() => null),
    ]);

  const subscribers: Stat = subscriberData
    ? subscriberData.hasMore
      ? `${subscriberData.count}+`
      : subscriberData.count
    : null;

  return { events, upcoming, orders, users, categories, subscribers };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const tiles: {
    label: string;
    value: Stat;
    icon: typeof Calendar;
    href: string;
  }[] = [
    {
      label: "Total Events",
      value: stats.events,
      icon: Calendar,
      href: "/admin/events",
    },
    {
      label: "Upcoming",
      value: stats.upcoming,
      icon: CalendarClock,
      href: "/admin/events",
    },
    {
      label: "Orders",
      value: stats.orders,
      icon: ShoppingBag,
      href: "/admin/events/orders",
    },
    {
      label: "Subscribers",
      value: stats.subscribers,
      icon: Mail,
      href: "/admin/newsletter",
    },
    {
      label: "Users",
      value: stats.users,
      icon: UsersRound,
      href: "/admin/users",
    },
    {
      label: "Categories",
      value: stats.categories,
      icon: Boxes,
      href: "/admin/categories",
    },
  ];

  return (
    <AdminPage
      title="Dashboard"
      description="At a glance across your events, orders, and community."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.label} href={tile.href} className="block">
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tile.label}
                  </span>
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                </div>
                <p className="mt-3 font-display text-4xl text-foreground">
                  {tile.value ?? "—"}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </AdminPage>
  );
}
