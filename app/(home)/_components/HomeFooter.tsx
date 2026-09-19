"use client";

import { track } from "@vercel/analytics";
import { instructorEmailAddress, socialLinks } from "@/app/_lib/constants";

export default function HomeFooter() {
  return (
    <footer
      data-testid="footer"
      className="flex flex-wrap justify-between gap-4 px-gutter text-[13px] text-ink-label"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <span>© {new Date().getFullYear()} Aaron Curtis</span>
      <div data-testid="footer-social-links" className="flex flex-wrap gap-6">
        {socialLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={link.testId}
            aria-label={link.ariaLabel}
            className="transition-opacity hover:opacity-70"
            onClick={() => {
              track("social_media", {
                action: link.trackAction,
                source: "footer",
              });
            }}
          >
            {link.name}
          </a>
        ))}
        <a
          href={`mailto:${instructorEmailAddress}`}
          data-testid="footer-email-link"
          aria-label="Email Aaron"
          className="transition-opacity hover:opacity-70"
        >
          Email
        </a>
      </div>
    </footer>
  );
}
