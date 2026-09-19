import { ReactNode } from "react";
import type { Viewport } from "next";
import HomeNav from "./_components/HomeNav";
import HomeFooter from "./_components/HomeFooter";

// The homepage runs the moss/sand palette rather than the site's blues, so the
// document itself is painted sand. globals.css puts white on <html> for the
// rest of the site; without this, overscroll on macOS and iOS and the PWA
// status-bar area flash white above and below a sand page.
export const viewport: Viewport = {
  themeColor: "#ece6da",
};

/**
 * Chrome for the (home) route group. Any page added here gets the nav, the
 * footer and the palette; app/(root)/layout.tsx does the same job for every
 * other public page with the shared Header and Footer.
 */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style href="home-sand-surface" precedence="high">
        {"html,body{background-color:#ece6da}"}
      </style>
      <div className="min-h-dvh overflow-hidden bg-sand font-karla text-ink leading-[normal]">
        <HomeNav />
        <main>{children}</main>
        <HomeFooter />
      </div>
    </>
  );
}
