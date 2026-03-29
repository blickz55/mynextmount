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
    const email = session.user.email?.trim() ?? "";
    const short =
      email.length > 28 ? `${email.slice(0, 26)}…` : email || "Signed in";
    return (
      <nav className="auth-nav" aria-label="Account">
        <span className="auth-nav__account" title={email || undefined}>
          <span className="auth-nav__account-label">{short}</span>
          <span className="auth-nav__badge" aria-hidden>
            Account
          </span>
        </span>
        <Link href="/tool" className="auth-nav__link">
          Tool
        </Link>
        <Link href="/account" className="auth-nav__link" prefetch>
          My Mounts
        </Link>
        <button
          type="button"
          className="auth-nav__btn"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </nav>
    );
  }

  return (
    <nav className="auth-nav" aria-label="Account">
      <Link
        href="/login?callbackUrl=/tool"
        className="auth-nav__link"
      >
        Sign in
      </Link>
      <Link
        href="/register?callbackUrl=/tool"
        className="auth-nav__link auth-nav__link--secondary"
      >
        Register
      </Link>
    </nav>
  );
}
