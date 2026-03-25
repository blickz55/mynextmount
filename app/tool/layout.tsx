import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommender",
  description:
    "Paste your WoW mount export from the MyNextMount addon and see top mounts to farm at mynextmount.com.",
  openGraph: {
    title: "MyNextMount — what to farm next",
    description:
      "Paste your WoW mount export from the MyNextMount addon and see top mounts to farm.",
    url: "/tool",
  },
};

export default function ToolLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
