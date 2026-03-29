import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountStaleSessionActions } from "@/components/AccountStaleSessionActions";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";
import { mounts } from "@/lib/mounts";
import { prisma } from "@/lib/prisma";
import { retryAsync } from "@/lib/retryAsync";
import { deserializeSpellIds } from "@/lib/savedCollection";
import { computeWeeklyPlanMounts } from "@/lib/weeklyPlan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "My Mounts",
  description:
    "Saved mount export, completion stats, and weekly farm suggestions for MyNextMount.",
};

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const highlightBannerUrl =
  typeof process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL === "string"
    ? process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL.trim()
    : "";

function formatUpdatedAt(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d);
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  let user: {
    email: string;
    collectionSpellIds: string;
    collectionUpdatedAt: Date | null;
  } | null = null;
  let dbLoadFailed = false;
  try {
    user = await retryAsync(
      () =>
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            email: true,
            collectionSpellIds: true,
            collectionUpdatedAt: true,
          },
        }),
      { retries: 2, delayMs: 400 },
    );
  } catch (e) {
    console.error("[account/page] prisma.user.findUnique", e);
    dbLoadFailed = true;
  }

  if (dbLoadFailed) {
    return (
      <main id="main-content" tabIndex={-1} className="app-main app-shell">
        <ShellTopbar />
        <SiteBrand
          brandLogoUrl={brandLogoUrl}
          showMission
          highlightBannerUrl={highlightBannerUrl}
          homeHref="/tool"
        />
        <h2 className="section-title">My Mounts</h2>
        <p className="lead">
          We couldn&apos;t load your saved data from the database. This is
          usually a temporary connection issue on the server.
        </p>
        <p className="status-block">
          <Link href="/account">Try again</Link>
          {" · "}
          <Link href="/tool">Open the tool</Link>
          {" · "}
          <Link href="/login">Sign in again</Link>
        </p>
        <p className="field-hint">
          If this keeps happening, check host logs for{" "}
          <code>[account/page] prisma.user.findUnique</code>.
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" tabIndex={-1} className="app-main app-shell">
        <ShellTopbar />
        <SiteBrand
          brandLogoUrl={brandLogoUrl}
          showMission
          highlightBannerUrl={highlightBannerUrl}
          homeHref="/tool"
        />
        <h2 className="section-title">My Mounts</h2>
        <p className="lead">
          Your browser session is active, but we could not find a matching account
          in the database (for example after a reset or provider change).
        </p>
        <AccountStaleSessionActions />
        <p className="status-block">
          <Link href="/tool">Open the tool</Link>
          {" · "}
          <Link href="/register">Create a new account</Link>
        </p>
      </main>
    );
  }

  const rawSpellBlob =
    user.collectionSpellIds == null ? "" : String(user.collectionSpellIds);
  let owned: number[] = [];
  try {
    owned = deserializeSpellIds(rawSpellBlob);
  } catch (e) {
    console.error("[account/page] deserializeSpellIds", e);
  }

  const brandHomeHref = owned.length > 0 ? "/" : "/tool";
  const ownedSet = new Set(owned);
  const catalogRetail = mounts.filter((m) => m.retailObtainable !== false);
  const matched = catalogRetail.filter((m) => ownedSet.has(m.id)).length;
  const total = catalogRetail.length;
  const pct = total > 0 ? Math.round((matched / total) * 1000) / 10 : 0;

  let plan: ReturnType<typeof computeWeeklyPlanMounts> = [];
  try {
    plan = computeWeeklyPlanMounts(mounts, owned, 10);
  } catch (e) {
    console.error("[account] weekly plan", e);
  }
  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SiteBrand
        brandLogoUrl={brandLogoUrl}
        showMission
        highlightBannerUrl={highlightBannerUrl}
        homeHref={brandHomeHref}
      />
      <h2 className="section-title">My Mounts</h2>
      <p className="lead">
        Signed in as <strong>{user.email}</strong>. Your saved export is used for
        completion stats and the weekly suggestions below — same rules as the
        main tool (Retail catalog, unobtainable mounts excluded from farm math).
      </p>

      <section className="content-section" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="section-title account-section-heading">
          Saved export
        </h2>
        <ul className="account-stats">
          <li>
            <strong>{owned.length}</strong> spell IDs stored
          </li>
          <li>
            Last updated: {formatUpdatedAt(user.collectionUpdatedAt)}
          </li>
          <li>
            <strong>{matched}</strong> of <strong>{total}</strong> Retail mounts
            in this site&apos;s data match your export ({pct}% of catalog).
          </li>
        </ul>
        {owned.length === 0 ? (
          <p className="status-block">
            Nothing saved for this account yet. On{" "}
            <Link href="/tool">the tool</Link>, paste your <code>M:…</code> line
            and click <strong>Save to my account</strong>; after it succeeds,
            refresh this page. Spell IDs are stored on your user row in Postgres
            (e.g. via Supabase) — same flow as login, no separate upload service.
          </p>
        ) : (
          <p className="status-block">
            <Link href="/tool">View my collection on the tool</Link> — when
            you&apos;re signed in, your saved spell list loads automatically on
            the recommender page (or use <strong>Sync from account</strong> if you
            pasted a different export).
          </p>
        )}
      </section>

      <section className="content-section" aria-labelledby="weekly-heading">
        <h2 id="weekly-heading" className="section-title account-section-heading">
          This week&apos;s suggested farms
        </h2>
        <p className="section-intro">
          Top 10 missing mounts by <strong>Efficient (EV-style)</strong> score,
          using default source filters (in-game shop opt-in, same as the tool).
        </p>
        {plan.length === 0 ? (
          <p className="status-block">
            No suggestions — save a collection that leaves at least one farmable
            mount missing, or enable more source filters on the tool.
          </p>
        ) : (
          <ol className="weekly-plan-list">
            {plan.map((m) => (
              <li key={m.id}>
                <span className="weekly-plan-list__name">{m.name}</span>
                <span className="weekly-plan-list__meta">
                  {" "}
                  — spell {m.id}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="content-section account-danger-zone" aria-labelledby="danger-heading">
        <h2 id="danger-heading" className="section-title account-section-heading">
          Account data
        </h2>
        <p className="section-intro">
          Delete removes your email, password hash, and saved spell list from this
          server.
        </p>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
