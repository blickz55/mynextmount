"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <nav className="auth-nav" aria-label="Account">
        <span className="auth-nav__muted">…</span>
      </nav>
    );
  }

  if (session?.user) {
    return (
      <nav className="auth-nav" aria-label="Account">
        <Link href="/tool" className="auth-nav__link">
          Tool
        </Link>
        <Link href="/account" className="auth-nav__link">
          My collection
        </Link>
        <button
          type="button"
          className="auth-nav__btn"
          onClick={() => signOut({ callbackUrl: "/tool" })}
        >
          Sign out
        </button>
      </nav>
    );
  }

  return (
    <nav className="auth-nav" aria-label="Account">
      <Link href="/login" className="auth-nav__link">
        Sign in
      </Link>
      <Link href="/register" className="auth-nav__link auth-nav__link--secondary">
        Register
      </Link>
    </nav>
  );
}
