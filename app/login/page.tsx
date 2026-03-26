import type { Metadata } from "next";
import { Suspense } from "react";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save your WoW mount export on MyNextMount.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" tabIndex={-1} className="app-main app-shell">
          <p className="lead">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
