import Link from "next/link";
import { track } from "@vercel/analytics";
import { instructorEmailAddress, socialLinks } from "@/app/_lib/constants";

const Footer = () => {
  return (
    <footer
      data-testid="footer"
      className="flex-shrink-0 bg-navy py-9 text-white/55"
      style={{
        paddingBottom: "max(2.25rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="flex flex-col-reverse items-center gap-7 sm:flex-row sm:justify-between">
          <span className="text-sm font-medium lowercase">
            © {new Date().getFullYear()} aaron curtis
          </span>

          <div
            data-testid="footer-social-links"
            className="flex items-center gap-7"
          >
            {socialLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={link.testId}
                aria-label={link.ariaLabel}
                className="text-[15px] font-medium lowercase text-white transition-colors hover:text-sky"
                onClick={() => {
                  track("social_media", {
                    action: link.trackAction,
                    source: "footer",
                  });
                }}
              >
                {link.name}
              </Link>
            ))}
            <a
              href={`mailto:${instructorEmailAddress}`}
              data-testid="footer-email-link"
              aria-label="Email Aaron"
              className="text-[15px] font-medium lowercase text-white transition-colors hover:text-sky"
            >
              email
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
