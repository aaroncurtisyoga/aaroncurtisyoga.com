"use client";

import { FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, User, Mail, Shield } from "lucide-react";
import { track } from "@vercel/analytics";
import { unauthenticatedLinks } from "@/app/_lib/constants";

interface NavLink {
  href: string;
  name: string;
  testId: string;
}

interface MobileNavLinksProps {
  adminLinks: NavLink[];
  isSignedIn: boolean;
  isMenuOpen: boolean;
  onClose: () => void;
}

const getIconForLink = (href: string) => {
  if (href.includes("home") || href === "/")
    return <Home className="w-4 h-4" />;
  if (href.includes("classes")) return <Calendar className="w-4 h-4" />;
  if (href.includes("about")) return <User className="w-4 h-4" />;
  if (href.includes("newsletter")) return <Mail className="w-4 h-4" />;
  return null;
};

const MobileNavLinks: FC<MobileNavLinksProps> = ({
  adminLinks,
  isSignedIn,
  isMenuOpen,
  onClose,
}) => {
  const pathname = usePathname();

  return (
    <>
      {/* Navigation links */}
      {unauthenticatedLinks.map((link, index) => (
        <div
          key={`${link.name}-${index}`}
          style={{
            animation: isMenuOpen
              ? `fadeInUp 0.2s ease-out ${index * 0.03 + 0.1}s both`
              : "",
          }}
        >
          <Link
            data-testid={`navbar-menu-item-${link.testId}`}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
              pathname.includes(link.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
            href={link.href}
            onClick={() => {
              track("navigation", {
                action: "mobile_nav_click",
                destination: link.name.toLowerCase(),
                href: link.href,
              });
              onClose();
            }}
          >
            {getIconForLink(link.href)}
            <span className="text-base lowercase">{link.name}</span>
          </Link>
        </div>
      ))}

      {/* Admin links */}
      {isSignedIn && adminLinks.length > 0 && (
        <>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">
              Admin
            </p>
          </div>
          {adminLinks.map((link, index) => (
            <div
              key={`${link.name}-${index}`}
              style={{
                animation: isMenuOpen
                  ? `fadeInUp 0.2s ease-out ${(unauthenticatedLinks.length + index) * 0.03 + 0.1}s both`
                  : "",
              }}
            >
              <Link
                data-testid={`navbar-menu-item-${link.testId}`}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname.includes(link.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
                href={link.href}
                onClick={() => {
                  track("navigation", {
                    action: "mobile_admin_click",
                    destination: link.name.toLowerCase(),
                    href: link.href,
                  });
                  onClose();
                }}
              >
                <Shield className="w-4 h-4" />
                <span className="text-base">{link.name}</span>
              </Link>
            </div>
          ))}
        </>
      )}
    </>
  );
};

export default MobileNavLinks;
