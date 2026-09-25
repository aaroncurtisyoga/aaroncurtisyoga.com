import { connection } from "next/server";
import {
  getHomepageFeaturedEventsCached,
  getUpcomingEventsCached,
} from "@/app/_lib/actions/event.queries";
import type { HomepageClass } from "./_lib/types";
import HomeHero from "./_components/HomeHero";
import FeaturedEvents from "./_components/FeaturedEvents";
import UpcomingClasses from "./_components/UpcomingClasses";
import HomeAbout from "./_components/HomeAbout";
import HomeNewsletter from "./_components/HomeNewsletter";

/**
 * The homepage's own nav, footer and palette live in app/(home)/layout.tsx.
 * Every other public page uses the shared Header/Footer from
 * app/(root)/layout.tsx and the blue system.
 */
export default async function HomePage() {
  // Render per request so the "today / in N days" label and the upcoming
  // filter use the real clock. The event data itself still comes from the
  // 15-minute data cache, so this doesn't wake the database on every hit.
  await connection();
  const now = new Date();
  const featuredAll = await getHomepageFeaturedEventsCached(2).catch(
    (error: unknown): HomepageClass[] => {
      console.error("[HomePage] Failed to load featured events:", error);
      return [];
    },
  );
  // Same staleness guard as the class list below, but on the end time: a
  // featured event stays up while it's running.
  const featured = featuredAll.filter(
    (event) => new Date(event.endDateTime) >= now,
  );

  // Featured events are kept out of the class list so nothing shows twice.
  const { events, total } = await getUpcomingEventsCached(
    3,
    featuredAll.map((event) => event.id),
  ).catch((error: unknown): { events: HomepageClass[]; total: number } => {
    // Hide the classes rather than 500 the page. The failure isn't cached,
    // so the next request tries again.
    console.error("[HomePage] Failed to load upcoming classes:", error);
    return { events: [], total: 0 };
  });

  // The cached list was filtered when it was filled, up to 15 minutes ago, so
  // drop anything that has started since. The hero label is the reason this
  // page renders per request; a class in the past must never reach it.
  const upcoming = events.filter(
    (event) => new Date(event.startDateTime) >= now,
  );
  const stillAhead = Math.max(
    total - (events.length - upcoming.length),
    upcoming.length,
  );
  const next = upcoming[0] ?? null;

  return (
    <>
      <HomeHero next={next} now={now} />
      {featured.length > 0 && <FeaturedEvents events={featured} />}
      {/* The nav's Classes link has to resolve even when there's nothing on
          the calendar and the section below renders nothing. */}
      <div id="classes">
        {upcoming.length > 0 && (
          <UpcomingClasses events={upcoming} total={stillAhead} />
        )}
      </div>
      <HomeAbout />
      <HomeNewsletter />
    </>
  );
}
