import Image from "next/image";
import Link from "next/link";
import handstand from "@/public/assets/images/handstand_cutout.png";
import { formatDateTime, getEventBookingLink } from "@/app/_lib/utils";
import type { HomepageClass } from "../_lib/types";
import { daysUntilInET, describeDaysUntil } from "../_lib/next-class";

interface HomeHeroProps {
  next: HomepageClass | null;
  now: Date;
}

export default function HomeHero({ next, now }: HomeHeroProps) {
  return (
    <section
      data-testid="home-hero"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(32px,4vw,48px)] px-gutter pb-section pt-[clamp(8px,2vw,24px)]"
    >
      <div>
        <h1 className="font-cormorant text-[clamp(56px,8.5vw,112px)] font-normal leading-[0.95] tracking-[-0.02em] text-balance">
          An honest <em>practice.</em>
        </h1>
        <p className="mt-[clamp(20px,3vw,32px)] max-w-[460px] text-[clamp(17px,1.4vw,19px)] leading-[1.55] text-ink-muted text-pretty">
          Yoga, movement &amp; sound in Washington, DC. Sunrise flows, power
          vinyasa, and live sound baths.
        </p>
        {next && <NextClassCard event={next} now={now} />}
      </div>

      {/* The cap scales with the viewport as well as with the grid. Between
          the phone and the ~990px two-column switch the column is still full
          width, so a flat 560px cap left the image as large as it is on a
          1440px desktop. */}
      <div className="relative aspect-[7/9] w-full max-w-[clamp(260px,50vw,560px)] justify-self-center">
        <div
          aria-hidden="true"
          className="absolute inset-x-[7%] top-[11%] bottom-0 bg-moss"
          style={{ borderRadius: "50% 50% 24px 24px / 43% 43% 24px 24px" }}
        />
        <Image
          src={handstand}
          alt="Aaron holding a handstand"
          fill
          priority
          sizes="(min-width: 1200px) 560px, (min-width: 640px) 50vw, 70vw"
          className="object-contain"
        />
      </div>
    </section>
  );
}

function NextClassCard({ event, now }: { event: HomepageClass; now: Date }) {
  const { dateShortWithoutYear, timeOnly } = formatDateTime(
    event.startDateTime,
  );
  const when = describeDaysUntil(daysUntilInET(event.startDateTime, now));
  // Same destination the class cards use: the studio's booking page for a
  // synced class, the event page for one sold here. The card already names a
  // specific class, so the button books that class rather than scrolling to
  // a list the visitor has to search.
  const { href, external } = getEventBookingLink(event);

  return (
    <div
      data-testid="next-class-card"
      className="mt-[clamp(28px,4vw,48px)] flex flex-wrap items-center justify-between gap-6 rounded-[20px] bg-sand-deep px-[clamp(20px,2.5vw,32px)] py-[clamp(20px,2.5vw,28px)]"
    >
      <div>
        <p className="mb-1.5 text-[13px] uppercase tracking-[0.12em] text-ink-label">
          Next class · {when}
        </p>
        <p className="font-cormorant text-[26px] font-medium">{event.title}</p>
        <p className="mt-0.5 text-ink-muted">
          {dateShortWithoutYear} · {timeOnly.toLowerCase()}
        </p>
      </div>
      <Link
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="whitespace-nowrap rounded-full bg-moss px-6 py-3.5 font-medium text-sand transition-opacity hover:opacity-70"
      >
        Save a spot
      </Link>
    </div>
  );
}
