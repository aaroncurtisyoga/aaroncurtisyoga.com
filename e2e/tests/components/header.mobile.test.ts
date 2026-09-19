import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";
import {
  getUnauthenticatedLinks,
  getUserLinks,
  getAdminLinks,
} from "@/e2e/tests/constants/navigation";
import { signInAs, ensureSignedOut } from "@/e2e/tests/utils/auth";
import {
  verifyLinks,
  openMobileMenu,
  openMobileUserMenu,
} from "@/e2e/tests/utils/navigation";

test.describe("Mobile Header Navigation", () => {
  // Set mobile viewport for all tests in this file
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.setViewportSize({ width: 375, height: 667 });
    // The homepage has its own nav; the shared Header renders on the other
    // public pages.
    await page.goto("/newsletter");
  });

  test("mobile menu is visible when toggled", async ({ page }) => {
    await openMobileMenu(page);
    const mobileMenu = page.getByTestId("navbar-menu-mobile");
    await expect(mobileMenu).toBeVisible();
  });

  test("displays unauthenticated links correctly", async ({ page }) => {
    await ensureSignedOut(page);

    // Open the mobile menu
    await openMobileMenu(page);

    // Get mobile version of unauthenticated links (isMobile = true)
    const mobileLinks = getUnauthenticatedLinks(true);
    await verifyLinks(page, mobileLinks);
  });

  test("shows admin links for admin users in mobile menu", async ({ page }) => {
    await signInAs(page, "admin");

    // Open the mobile menu
    await openMobileMenu(page);

    // Open the user menu button if needed
    await openMobileUserMenu(page);

    // Get mobile version of admin links (isMobile = true)
    const mobileAdminLinks = getAdminLinks(true);
    await verifyLinks(page, mobileAdminLinks);
  });

  test("shows account link for all authenticated users in mobile menu", async ({
    page,
  }) => {
    await signInAs(page, "user");

    // Open the mobile menu
    await openMobileMenu(page);

    // Open the user menu if needed
    await openMobileUserMenu(page);

    // Get mobile version of user links (isMobile = true)
    const mobileUserLinks = getUserLinks(true);
    await verifyLinks(page, mobileUserLinks);
  });
});
