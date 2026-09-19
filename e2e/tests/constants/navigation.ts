export interface NavLink {
  name: string;
  href: string;
  testId: string;
}

// Mirrors unauthenticatedLinks in app/_lib/constants/index.ts.
const baseUnauthenticatedLinks = [
  { name: "Classes", href: "/#classes", baseTestId: "classes-link" },
  { name: "About", href: "/#about", baseTestId: "about-link" },
  { name: "Newsletter", href: "/#newsletter", baseTestId: "newsletter-link" },
];

// Pre-existing gap: nothing in the app renders an account link today, so the
// two "account link" tests fail on this list. Left as-is rather than deleted
// with the redesign; either add the link to UserDropdown or drop those tests.
const baseUserLinks = [
  {
    name: "Account",
    href: "/account",
    baseTestId: "account-link",
  },
];

// Mirrors adminDashboardLinks in app/_lib/constants/index.ts.
const baseAdminLinks = [
  {
    name: "Admin Dashboard",
    href: "/admin",
    baseTestId: "admin-dashboard-link",
  },
];

/**
 * Mobile testIds are prefixed with "navbar-menu-item-" to avoid conflicts
 */
function getFormattedLinks(
  links: Array<{ name: string; href: string; baseTestId: string }>,
  isMobile: boolean,
): NavLink[] {
  return links.map((link) => ({
    name: link.name,
    href: link.href,
    testId: isMobile
      ? `navbar-menu-item-${link.baseTestId}`
      : `${link.baseTestId}`,
  }));
}

export function getUnauthenticatedLinks(isMobile: boolean): NavLink[] {
  return getFormattedLinks(baseUnauthenticatedLinks, isMobile);
}

export function getUserLinks(isMobile: boolean): NavLink[] {
  return getFormattedLinks(baseUserLinks, isMobile);
}

export function getAdminLinks(isMobile: boolean): NavLink[] {
  return getFormattedLinks(baseAdminLinks, isMobile);
}
