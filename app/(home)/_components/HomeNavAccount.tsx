"use client";

import { useUser } from "@clerk/nextjs";
import UserDropdown from "@/app/_components/Header/UserDropdown";
import { adminDashboardLinks } from "@/app/_lib/constants";

// UserDropdown renders nothing for signed-out visitors, so the public nav
// matches the design exactly while the signed-in admin keeps an entry point.
export default function HomeNavAccount() {
  const { user, isSignedIn, isLoaded } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <UserDropdown
      linksForLoggedInUsers={isAdmin ? adminDashboardLinks : []}
      isSignedIn={isSignedIn || false}
      isLoaded={isLoaded}
    />
  );
}
