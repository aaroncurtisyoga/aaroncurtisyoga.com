import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublicNewsletterCached } from "@/app/_lib/actions/newsletter.queries";
import {
  renderNewsletterHtml,
  resolveMergeTags,
} from "@/app/_lib/email/newsletter-template";
import { formatDateTime } from "@/app/_lib/utils";

interface NewsletterIssuePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: NewsletterIssuePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const newsletter = await getPublicNewsletterCached(id);
    if (!newsletter) return { title: "The Newsletter" };
    return {
      // Template appends the site name; the subject alone is the title.
      title: newsletter.subject,
      description: newsletter.previewText ?? undefined,
    };
  } catch {
    return { title: "The Newsletter" };
  }
}

/**
 * Prepare the archived email for the browser: resolve merge tags to their
 * no-name fallbacks, unwrap the per-recipient unsubscribe link into plain
 * text (in an archive it has no one to unsubscribe, and the injected base
 * target would open it as a blank tab), and open real links in a new tab
 * (the iframe sandbox blocks same-tab navigation).
 */
function toBrowserHtml(html: string): string {
  return resolveMergeTags(html)
    .replace(
      /<a\s[^>]*href="\{\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}\}"[^>]*>([\s\S]*?)<\/a>/gi,
      "$1",
    )
    .replace(/\{\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}\}/g, "#")
    .replace("<head>", '<head><base target="_blank">');
}

const NewsletterIssuePage = async ({ params }: NewsletterIssuePageProps) => {
  const { id } = await params;
  let newsletter;
  try {
    newsletter = await getPublicNewsletterCached(id);
  } catch {
    // Transient DB failure (Neon waking up). Deliberately NOT cached: the
    // read throws instead of returning null, so a refresh retries.
    return (
      <p className="px-gutter pb-section text-[17px] text-ink-muted">
        This issue is taking a moment to load. Please refresh in a few seconds.
      </p>
    );
  }
  if (!newsletter) notFound();

  // Issues sent since snapshots exist render exactly what was mailed; older
  // ones fall back to the message body alone (their event sections can't be
  // reconstructed honestly). The fallback keeps the unsubscribe placeholder
  // so toBrowserHtml unwraps both paths the same way.
  const html = toBrowserHtml(
    newsletter.sentHtml ??
      renderNewsletterHtml({
        contentHtml: resolveMergeTags(newsletter.content),
        previewText: newsletter.previewText ?? undefined,
      }),
  );

  return (
    <article className="px-gutter pb-section">
      <Link
        href="/newsletter"
        className="inline-flex items-center gap-1.5 text-[15px] text-ink-muted transition-opacity hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" /> All issues
      </Link>
      {newsletter.sentAt && (
        <p className="mt-6 text-[13px] uppercase tracking-[0.12em] text-ink-label">
          {formatDateTime(newsletter.sentAt).dateOnly}
        </p>
      )}
      <h1 className="mt-2 max-w-[20ch] font-cormorant text-[clamp(40px,5.5vw,72px)] font-normal leading-[1] tracking-[-0.01em] text-balance">
        {newsletter.subject}
      </h1>
      {/* The email is 600px wide on its own sand ground, so the frame drops
          its border and sits flush with the page. */}
      <iframe
        title={newsletter.subject}
        srcDoc={html}
        // Links escape via the injected <base target="_blank">; everything
        // else stays sandboxed.
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="mt-[clamp(24px,3vw,40px)] h-[80vh] w-full bg-sand"
      />
    </article>
  );
};

export default NewsletterIssuePage;
