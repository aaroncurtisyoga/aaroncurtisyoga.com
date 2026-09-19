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
    // Transient DB failure (Neon waking up). Deliberately NOT cached — the
    // read throws instead of returning null — so a refresh retries.
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-16 md:px-6 lg:px-12">
        <p className="text-muted-foreground">
          This issue is taking a moment to load — please refresh in a few
          seconds.
        </p>
      </div>
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
    // Same container as the rest of the site; the email itself is 600px and
    // centers inside the frame below.
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-6 md:py-12 lg:px-12">
      <Link
        href="/newsletter"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All issues
      </Link>
      <h1 className="mt-3 font-display text-2xl uppercase text-foreground md:text-3xl">
        {newsletter.subject}
      </h1>
      {newsletter.sentAt && (
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDateTime(newsletter.sentAt).dateOnly}
        </p>
      )}
      <iframe
        title={newsletter.subject}
        srcDoc={html}
        // Links escape via the injected <base target="_blank">; everything
        // else stays sandboxed.
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        // Mirrors SAND, the email body ground in app/_lib/email/newsletter-template.ts.
        className="mt-6 h-[75vh] w-full rounded-md border bg-sand"
      />
    </div>
  );
};

export default NewsletterIssuePage;
