import type { EventWithLocationAndCategory } from "@/app/_lib/types";
import type { Serialized } from "@/app/_lib/utils/serialize";

/**
 * A class as it reaches the homepage. The query runs it through `serialize()`
 * and `unstable_cache` JSON round-trips it again, so every Date is really an
 * ISO string by the time a component sees it.
 */
export type HomepageClass = Serialized<EventWithLocationAndCategory>;
