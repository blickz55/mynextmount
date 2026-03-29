"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ShellTopbar } from "@/components/ShellTopbar";
import { SmartSiteBrand } from "@/components/SmartSiteBrand";
import { safeAppCallbackPath } from "@/lib/safeCallbackUrl";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const DEFAULT_CALLBACK = "/tool";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterLogin = useMemo(
    () => safeAppCallbackPath(searchParams.get("callbackUrl"), DEFAULT_CALLBACK),
    [searchParams],
  );
  const loginQuery = useMemo(() => {
    const q = new URLSearchParams();
    q.set("callbackUrl", afterLogin);
    return q.toString();
  }, [afterLogin]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setPending(false);
        return;
      }
      router.push(
        `/login?registered=1&callbackUrl=${encodeURIComponent(afterLogin)}`,
      );
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SmartSiteBrand brandLogoUrl={brandLogoUrl} />
      <h1 className="section-title">Create account</h1>
      <p className="lead">
        Beta access uses the same account as cloud save: after you register,
        sign in once to open the recommender. You can also sync your{" "}
        <strong>M:…</strong> export to the server from any device.
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
          autoComplete="new-password"
          className="input-text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <p className="field-hint">At least 8 characters.</p>
        {error !== null && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="status-block">
        Already have an account?{" "}
        <Link href={`/login?${loginQuery}`}>Sign in</Link> ·{" "}
        <Link href="/beta">Beta info</Link> · <Link href="/">Home</Link>
      </p>
    </main>
  );
}
