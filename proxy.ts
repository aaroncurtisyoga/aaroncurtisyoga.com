import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isDormantPath } from "@/app/_lib/dormant";

const isAuthenticatedRoute = createRouteMatcher([
  "/account",
  "/admin/(.*)",
  "/profile",
  "/settings",
]);

const isAdminRoute = createRouteMatcher(["/admin", "/admin/(.*)"]);

const previewOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

/**
 * Exact-match allowlist for the `azp` claim on Clerk session tokens, so a token
 * minted for some other origin under aaroncurtisyoga.com is rejected here. The
 * sibling subdomains are real: train. is the training tracker, and mindflow. is
 * served from a different Vercel account, where a dangling CNAME would be a
 * subdomain takeover waiting to replay tokens against this site.
 *
 * train. is deliberately absent. It mints its own host-local session, so no
 * legitimate request here ever carries a train. token. There is no wildcard
 * support, so a host missing from this list 401s on every authenticated request.
 *
 * Gated on VERCEL_ENV, not NODE_ENV: `next start` and every preview build also
 * set NODE_ENV=production, and a preview origin missing from this list sends the
 * sign-in page and the proxy into a redirect loop.
 */
const authorizedParties = [
  "https://www.aaroncurtisyoga.com",
  "https://aaroncurtisyoga.com",
  ...(process.env.VERCEL_ENV === "production"
    ? []
    : ["http://localhost:3000", ...previewOrigins]),
];

export default clerkMiddleware(
  async (auth, req) => {
    // Switched-off features answer 404 before anything else runs, so a dormant
    // route is not discoverable and its handler never executes. See
    // app/_lib/dormant.ts for the list and how to bring one back.
    if (isDormantPath(req.nextUrl.pathname)) {
      return new NextResponse(null, { status: 404 });
    }

    const authObject = await auth();

    const needsAuth = isAuthenticatedRoute(req) || isAdminRoute(req);

    // Not signed in on any protected route → send to sign-in and come back after.
    // This must run before the admin-role check, otherwise a signed-out visitor
    // to /admin gets bounced to "/" instead of being prompted to log in.
    if (needsAuth && !authObject.userId) {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Signed in but not an admin → keep them out of the admin area.
    if (
      isAdminRoute(req) &&
      authObject.sessionClaims?.metadata?.role !== "admin"
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  { authorizedParties },
);

export const config = {
  matcher: [
    // Everything except Next internals, the two API prefixes that authenticate
    // themselves, and requests for a static file.
    //
    // The extension test is anchored to the END of the path on purpose. An
    // earlier version excluded any path *containing* a dot, which meant
    // /admin/<id>.x/edit never reached this middleware and rendered to anyone.
    "/((?!_next|api/cron/|api/webhooks/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|mjs|map|txt|xml|json|webmanifest|woff2?|ttf|otf)$).*)",
    "/",
    "/api/((?!cron/|webhooks/).*)",
    "/trpc(.*)",
  ],
};
