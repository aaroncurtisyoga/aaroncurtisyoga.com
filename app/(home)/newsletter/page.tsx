import { Metadata } from "next";
import Link from "next/link";
import HomeNewsletter from "../_components/HomeNewsletter";
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
    // Transient DB failure (Neon waking up). Deliberately NOT cached: the
    // read throws instead of returning [], so a refresh retries.
    return (
      <p className="px-gutter pb-section text-[17px] text-ink-muted">
        The archive is taking a moment to load. Please refresh in a few seconds.
      </p>
    );
  }

  return (
    <>
      <section className="px-gutter pb-section pt-[clamp(8px,2vw,24px)]">
        <h1 className="font-cormorant text-[clamp(56px,8.5vw,112px)] font-normal leading-[0.95] tracking-[-0.02em]">
          The Newsletter
        </h1>
        <p className="mt-[clamp(20px,3vw,32px)] max-w-[52ch] text-[clamp(17px,1.4vw,19px)] leading-[1.55] text-ink-muted text-pretty">
          Every issue, as it was sent. One short email a month: what I&rsquo;m
          teaching, where to find me, and one small thing to take onto the mat.
        </p>

        {newsletters.length === 0 ? (
          <p className="mt-10 text-[17px] text-ink-muted">
            The first archived issue will show up here after the next send. Sign
            up below so you don&rsquo;t miss it.
          </p>
        ) : (
          <ul className="mt-[clamp(32px,5vw,56px)] max-w-3xl border-t border-line">
            {newsletters.map((newsletter) => (
              <li key={newsletter.id} className="border-b border-line">
                <Link
                  href={`/newsletter/${newsletter.id}`}
                  className="group block py-6 transition-opacity hover:opacity-70"
                >
                  {newsletter.sentAt && (
                    <p className="text-[13px] uppercase tracking-[0.12em] text-ink-label">
                      {formatDateTime(newsletter.sentAt).dateOnly}
                    </p>
                  )}
                  <h2 className="mt-1.5 font-cormorant text-[clamp(26px,2.6vw,32px)] font-normal leading-[1.15]">
                    {newsletter.subject}
                  </h2>
                  {newsletter.previewText && (
                    <p className="mt-1.5 text-ink-muted">
                      {newsletter.previewText}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HomeNewsletter />
    </>
  );
};

export default NewsletterArchivePage;
