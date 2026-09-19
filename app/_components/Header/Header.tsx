"use client";

import { FC, useState } from "react";
import DesktopNavbarContent from "@/app/_components/Header/DesktopNavbarContent";
import MobileNavbarContent from "@/app/_components/Header/MobileNavbarContent";
import Logo from "@/app/_components/Header/Logo";
import UserDropdown from "@/app/_components/Header/UserDropdown";
import { useUser } from "@clerk/nextjs";
import { adminDashboardLinks } from "@/app/_lib/constants";

const Header: FC = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-50 w-full border-b border-slate-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <nav className="mx-auto max-w-screen-2xl flex items-center px-4 md:px-6 lg:px-12 py-4">
        <Logo />

        {/* Desktop navigation */}
        <DesktopNavbarContent>
          <UserDropdown
            linksForLoggedInUsers={isAdmin ? adminDashboardLinks : []}
            isSignedIn={isSignedIn || false}
            isLoaded={isLoaded}
          />
        </DesktopNavbarContent>

        {/* Mobile navigation */}
        <MobileNavbarContent
          linksForLoggedInUsers={isAdmin ? adminDashboardLinks : []}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          isSignedIn={isSignedIn || false}
          isLoaded={isLoaded}
          user={user}
        />
      </nav>
    </header>
  );
};

export default Header;
