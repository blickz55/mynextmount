import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Beta access",
  description:
    "Sign up for the MyNextMount beta to use the mount farming recommender.",
};

export default function BetaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <main id="main-content" tabIndex={-1} className="app-main app-shell">
          <p className="lead">Loading…</p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
