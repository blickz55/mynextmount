import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create a MyNextMount beta account to use the mount recommender and optional cloud save.",
};

export default function RegisterLayout({
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
