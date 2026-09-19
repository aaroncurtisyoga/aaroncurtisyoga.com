import { ReactNode } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import {
  Anton,
  Barlow,
  Cormorant_Garamond,
  Karla,
  Merriweather,
} from "next/font/google";
import { Providers } from "@/app/providers";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
});

// Homepage redesign faces (see the moss/sand tokens in globals.css).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-karla",
});

export const metadata: Metadata = {
  // The apex 308-redirects to www, so www is canonical. Required before any
  // metadata field can use a relative URL, and it is what resolves the
  // app/opengraph-image.png file convention to an absolute og:image.
  metadataBase: new URL("https://www.aaroncurtisyoga.com"),
  title: {
    template: "%s | Aaron Curtis Yoga",
    default: "Aaron Curtis Yoga",
  },
  description:
    "Yoga, movement & sound in Washington, DC. Sunrise flows, power vinyasa, and live sound baths.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Aaron Curtis Yoga",
    title: "Aaron Curtis Yoga",
    description: "Yoga, movement & sound in Washington, DC.",
    url: "/",
    locale: "en_US",
  },
  // The image itself comes from app/opengraph-image.png and
  // app/twitter-image.png; Next emits the url, type and dimensions.
  twitter: {
    card: "summary_large_image",
    title: "Aaron Curtis Yoga",
    description: "Yoga, movement & sound in Washington, DC.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AC Yoga",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${barlow.variable} ${anton.variable} ${merriweather.variable} ${cormorant.variable} ${karla.variable} font-sans bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Analytics />
        </Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }`}
        </Script>
      </body>
    </html>
  );
}
