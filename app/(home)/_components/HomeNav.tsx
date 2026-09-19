import Link from "next/link";
import { unauthenticatedLinks } from "@/app/_lib/constants";
import HomeNavAccount from "./HomeNavAccount";

export default function HomeNav() {
  return (
    <nav
      aria-label="Primary"
      data-testid="home-nav"
      className="flex flex-wrap items-center justify-between gap-4 px-gutter pb-[clamp(18px,3vw,28px)] text-[15px]"
      style={{
        paddingTop:
          "calc(clamp(18px, 3vw, 28px) + env(safe-area-inset-top, 0px))",
      }}
    >
      <Link
        href="/"
        className="font-cormorant text-[clamp(20px,2vw,24px)] font-medium transition-opacity hover:opacity-70"
      >
        Aaron Curtis Yoga
      </Link>
      <div className="flex items-center gap-[clamp(18px,3vw,32px)]">
        {unauthenticatedLinks.map((link) => (
          <Link
            key={link.testId}
            href={link.href}
            data-testid={link.testId}
            className="transition-opacity hover:opacity-70"
          >
            {link.name}
          </Link>
        ))}
        <HomeNavAccount />
      </div>
    </nav>
  );
}
