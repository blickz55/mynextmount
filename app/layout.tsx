import "./globals.css";

import type { Metadata } from "next";
import { Cinzel, Source_Sans_3 } from "next/font/google";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MyNextMount — what to farm next",
  description:
    "Paste your WoW mount export from the MyNextMount addon and see top mounts to farm at mynextmount.com.",
  openGraph: {
    type: "website",
    siteName: "MyNextMount",
    url: "/",
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
      <body className={fontBody.className}>{children}</body>
    </html>
  );
}
