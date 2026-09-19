import { Metadata } from "next";
import Link from "next/link";
import NewsletterBand from "@/app/(root)/_components/NewsletterBand";
import { getPublicNewslettersCached } from "@/app/_lib/actions/newsletter.queries";
import { formatDateTime } from "@/app/_lib/utils";

export const metadata: Metadata = {
  // The root layout's title template appends "| Aaron Curtis Yoga".
  title: "The Newsletter",
  description:
    "Past issues of the newsletter. One short email a month: what I'm teaching, where to find me, and one small thing to take onto the mat.",
};

const NewsletterArchivePage = async () => {
  let newsletters;
  try {
    newsletters = await getPublicNewslettersCached();
  } catch {
    // Transient DB failure (Neon waking up). Deliberately NOT cached — the
    // read throws instead of returning [] — so a refresh retries.
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-16 md:px-6 lg:px-12">
        <p className="text-muted-foreground">
          The archive is taking a moment to load — please refresh in a few
          seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Same container as NewsletterBand and every other section, so the
          heading, the list, and the signup band below all share one left edge. */}
      <section className="mx-auto w-full max-w-screen-2xl px-4 py-12 md:px-6 md:py-16 lg:px-12">
        <div className="h-1.5 w-9 bg-primary" aria-hidden="true" />
        <h1 className="mt-4 font-display text-4xl uppercase text-foreground md:text-5xl">
          The Newsletter
        </h1>
        <p className="mt-3 max-w-[52ch] text-base font-medium text-[#3c3f4c] md:text-[17px]">
          Every issue, as it was sent. One short email a month ~ what I&rsquo;m
          teaching, where to find me, and one small thing to take onto the mat.
        </p>

        {newsletters.length === 0 ? (
          <p className="mt-10 text-muted-foreground">
            The first archived issue will appear here after the next send — sign
            up below so you don&rsquo;t miss it.
          </p>
        ) : (
          <ul className="mt-8 max-w-3xl divide-y divide-border">
            {newsletters.map((newsletter) => (
              <li key={newsletter.id}>
                <Link
                  href={`/newsletter/${newsletter.id}`}
                  className="group block py-5"
                >
                  {newsletter.sentAt && (
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(newsletter.sentAt).dateOnly}
                    </p>
                  )}
                  <h2 className="mt-0.5 text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                    {newsletter.subject}
                  </h2>
                  {newsletter.previewText && (
                    <p className="mt-1 text-muted-foreground">
                      {newsletter.previewText}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewsletterBand />
    </div>
  );
};

export default NewsletterArchivePage;
