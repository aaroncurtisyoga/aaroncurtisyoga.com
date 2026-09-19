/**
 * Routes that are switched off in production.
 *
 * The site currently does one job: show the classes I'm teaching and run the
 * newsletter. Nothing is sold through it. The payment, private-session booking
 * and blob-upload code is kept because it will come back, but until then it
 * shouldn't be reachable by anyone. Every path below answers 404, so it isn't
 * even discoverable.
 *
 * To bring one back: delete its line here, then re-read it before trusting it.
 * `/api/create-payment-intent` in particular still takes the charge amount from
 * the request body, so it must recompute the price server-side from
 * `calculateSessionPricing` before it goes live again.
 *
 * Enforced in two places, because Next's proxy doesn't see every path:
 *   - `proxy.ts` blocks everything its `matcher` covers, which is all pages
 *     and every API route except `/api/cron/*` and `/api/webhooks/*`.
 *   - `app/api/webhooks/stripe/route.ts` checks this list itself, since the
 *     matcher deliberately skips webhooks so signature verification can run.
 *
 * `/sign-up` is on the list for the same reason. Nothing public needs an
 * account while nothing is sold, and open sign-up is what turns an anonymous
 * stranger into a signed-in one with reach into every server action. This only
 * hides the route: Clerk also hosts its own sign-up page, so close it properly
 * under Restrictions in the Clerk dashboard as well.
 */
export const DORMANT_PATHS = [
  "/api/create-payment-intent", // takes the charge amount from the client
  "/api/upload-blob", // superseded by /api/upload-image, no callers
  "/api/webhooks/stripe", // nothing creates Stripe sessions right now
  "/private-sessions", // the booking wizard, unlinked from the site
  "/sign-up", // nothing public needs an account while nothing is sold
] as const;

/**
 * Payments are parked too, and this can't be expressed as a path.
 *
 * A server action is POSTed to whatever page compiled it in, addressed by an
 * action id that ships in that page's JavaScript. `checkoutOrder` is imported
 * by the checkout button on the live event pages, so 404ing a path does not
 * take it out of reach. It refuses on its own, and the UI reads this flag so
 * nobody is shown a button that throws.
 */
export const PAYMENTS_PARKED = true;

/** True when `pathname` is the dormant route itself or sits underneath it. */
export function isDormantPath(pathname: string): boolean {
  return DORMANT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
