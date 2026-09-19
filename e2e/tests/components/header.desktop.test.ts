import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";
import {
  getUnauthenticatedLinks,
  getUserLinks,
  getAdminLinks,
} from "@/e2e/tests/constants/navigation";
import { signInAs, ensureSignedOut } from "@/e2e/tests/utils/auth";
import { verifyLinks, openDesktopUserMenu } from "@/e2e/tests/utils/navigation";

test.describe("Desktop Header Navigation", () => {
  // Set desktop viewport for all tests in this file
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.setViewportSize({ width: 1280, height: 720 });
    // The homepage has its own nav; the shared Header renders on the other
    // public pages.
    await page.goto("/newsletter");
  });

  test("desktop menu is visible", async ({ page }) => {
    const desktopMenu = page.getByTestId("navbar-menu-desktop");
    await expect(desktopMenu).toBeVisible();
  });

  test("displays unauthenticated links correctly", async ({ page }) => {
    await ensureSignedOut(page);

    // Get desktop version of unauthenticated links (isMobile = false)
    const desktopLinks = getUnauthenticatedLinks(false);
    await verifyLinks(page, desktopLinks);
  });

  test("shows admin links for admin users", async ({ page }) => {
    await signInAs(page, "admin");

    // Click the user menu button to open the dropdown
    await openDesktopUserMenu(page);

    // Get desktop version of admin links (isMobile = false)
    const desktopAdminLinks = getAdminLinks(false);

    await verifyLinks(page, desktopAdminLinks);
  });

  test("shows account link for all authenticated users", async ({ page }) => {
    await signInAs(page, "user");

    // Click the user menu button to open the dropdown
    await openDesktopUserMenu(page);

    // Get desktop version of user links (isMobile = false)
    const desktopUserLinks = getUserLinks(false);
    await verifyLinks(page, desktopUserLinks);
  });
});
