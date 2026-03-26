import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Providers } from "@/components/Providers";
import { SkipToMainContent } from "@/components/SkipToMainContent";

const fontDisplay = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["600", "700"],
  display: "swap",
});

const fontBody = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mynextmount.com"
).replace(/\/$/, "");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MyNextMount",
    template: "%s — MyNextMount",
  },
  description:
    "World of Warcraft mount farming assistant: know what to farm next from the mounts you already own, with guides and an in-game export addon.",
  openGraph: {
    type: "website",
    siteName: "MyNextMount",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable}`}
      suppressHydrationWarning
    >
      <body className={fontBody.className}>
        <GoogleAnalytics />
        <SkipToMainContent />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
