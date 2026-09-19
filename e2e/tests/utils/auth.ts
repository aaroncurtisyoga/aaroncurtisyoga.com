import { clerk } from "@clerk/testing/playwright";
import { Page } from "@playwright/test";

/**
 * User roles for authentication
 */
export type UserRole = "admin" | "user";

/**
 * Sign in as a user with the specified role
 * Will use environment variables if available, otherwise fall back to route mocking
 */
export async function signInAs(page: Page, role: UserRole): Promise<void> {
  const isAdmin = role === "admin";

  // Determine which credentials to use based on role
  const username = isAdmin
    ? process.env.E2E_CLERK_ADMIN_USERNAME
    : process.env.E2E_CLERK_USER_USERNAME;

  const password = isAdmin
    ? process.env.E2E_CLERK_ADMIN_PASSWORD
    : process.env.E2E_CLERK_USER_PASSWORD;

  if (username && password) {
    // Use real authentication if credentials are available
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier: username,
        password: password,
      },
    });
  } else {
    // Fall back to route mocking if credentials aren't available
    await page.route("**/clerk/session", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          isSignedIn: true,
          user: {
            id: `test-${role}`,
            publicMetadata: { role },
          },
        }),
      }),
    );
  }

  // Reload the page with the new auth state
  await page.reload();
}

/**
 * Ensure the user is signed out
 */
export async function ensureSignedOut(page: Page): Promise<void> {
  try {
    await clerk.signOut({ page });
  } catch (e) {
    // May already be signed out, which is fine
  }

  // Reload after sign out
  await page.reload();
}
