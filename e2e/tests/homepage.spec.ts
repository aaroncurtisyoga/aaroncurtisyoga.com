import { test, expect } from "@playwright/test";

test.describe("Homepage Smoke Test", () => {
  test("should load and display the redesigned homepage", async ({ page }) => {
    const response = await page.goto("/");

    // No server errors
    expect(response?.status()).toBeLessThan(500);

    // Page loaded correctly
    await expect(page).toHaveTitle(/Aaron Curtis Yoga/i);

    // Hero is displayed
    await expect(
      page.getByRole("heading", { name: /an honest practice/i }),
    ).toBeVisible({ timeout: 10000 });

    // In-page nav points at the homepage sections
    const nav = page.getByTestId("home-nav");
    await expect(nav.getByTestId("classes-link")).toHaveAttribute(
      "href",
      "/#classes",
    );
    await expect(nav.getByTestId("about-link")).toHaveAttribute(
      "href",
      "/#about",
    );
    await expect(nav.getByTestId("newsletter-link")).toHaveAttribute(
      "href",
      "/#newsletter",
    );

    // The Upcoming section only renders when classes are on the calendar, so
    // assert on the sections that are always present.
    await expect(page.getByTestId("home-about")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /stay in touch/i }),
    ).toBeVisible();
  });
});
