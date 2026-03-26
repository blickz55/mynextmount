"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const redirectTo = searchParams.get("callbackUrl") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        redirectTo: redirectTo.startsWith("/") ? redirectTo : "/account",
      });
      if (!r?.ok) {
        setError("Invalid email or password.");
        setPending(false);
        return;
      }
      router.push(redirectTo.startsWith("/") ? redirectTo : "/account");
      router.refresh();
    } catch {
      setError("Sign-in failed. Try again.");
      setPending(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SiteBrand brandLogoUrl={brandLogoUrl} />
      <h1 className="section-title">Sign in</h1>
      {registered && (
        <p className="status-block status-block--success" role="status">
          Account created — sign in below.
        </p>
      )}
      <p className="lead">
        Save your mount export to your account and open your{" "}
        <Link href="/account">collection dashboard</Link>.
      </p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="input-text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="input-text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error !== null && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="status-block">
        No account? <Link href="/register">Register</Link> ·{" "}
        <Link href="/tool">Back to tool</Link>
      </p>
    </main>
  );
}
