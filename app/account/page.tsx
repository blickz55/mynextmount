import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountStaleSessionActions } from "@/components/AccountStaleSessionActions";
import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";
import { computeCollectionProgressStats } from "@/lib/collectionProgressStats";
import { mounts } from "@/lib/mounts";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
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
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
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
      () => findAppUserFromSession(session.user),
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
          Couldn&apos;t reach the server to load your mounts. Usually this
          passes in a minute.
        </p>
        <p className="status-block">
          <Link href="/account">Try again</Link>
          {" · "}
          <Link href="/tool">Open the tool</Link>
          {" · "}
          <Link href="/login">Sign in again</Link>
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
          You&apos;re signed in here, but we don&apos;t see that login in our
          records anymore (reset account, changed Google/Discord, etc.).
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
  const progress = computeCollectionProgressStats(owned, mounts);

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
        Signed in as <strong>{user.email}</strong>. We use your saved /mnm line
        for the progress bar and the weekly picks — same rules as the main tool
        (Retail-only, “gone” mounts skipped for farming).
      </p>
      <p className="status-block">
        <Link href="/account/settings">Account settings</Link>
        {" — "}
        region, weekly reset time, delete account.
      </p>

      <section className="content-section" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="section-title account-section-heading">
          Saved collection
        </h2>
        <ul className="account-stats">
          <li>
            <strong>{progress.storedSpellCount}</strong> mounts in your saved
            line
          </li>
          <li>
            Last updated: {formatUpdatedAt(user.collectionUpdatedAt)}
          </li>
          <li>
            <strong>{progress.matchedObtainable}</strong> of{" "}
            <strong>{progress.obtainableTotal}</strong> still-gettable Retail
            mounts on our list ({progress.percentComplete}% done). Same meaning
            as the green progress on the tool.
          </li>
          {progress.unknownSpellIdCount > 0 ? (
            <li className="account-stats__hint">
              <strong>{progress.unknownSpellIdCount}</strong>{" "}
              {progress.unknownSpellIdCount === 1 ? "entry" : "entries"} in your
              line
              don&apos;t match anything we list (typo, removed mount, or we&apos;re
              behind).
            </li>
          ) : null}
        </ul>
        {owned.length === 0 ? (
          <p className="status-block">
            Nothing saved yet. On <Link href="/tool">the tool</Link>, paste your{" "}
            <code>M:…</code> from <code>/mnm</code>, hit{" "}
            <strong>Save to my account</strong>, then refresh here.
          </p>
        ) : (
          <p className="status-block">
            <Link href="/tool?loadSaved=1">Open the tool with this list</Link>{" "}
            — handy if the big text box still has an old paste. Or hit{" "}
            <strong>Reload from account</strong> on the tool.
          </p>
        )}
      </section>

      <section className="content-section" aria-labelledby="weekly-heading">
        <h2 id="weekly-heading" className="section-title account-section-heading">
          This week&apos;s suggested farms
        </h2>
        <p className="section-intro">
          Ten mounts you&apos;re missing that score well in{" "}
          <strong>Farmable</strong> mode (drops &amp; vendors), with the same
          default checkboxes as the tool (shop off until you turn it on).
        </p>
        {plan.length === 0 ? (
          <p className="status-block">
            Nothing to suggest — you&apos;re either done or everything left is
            outside Farmable rules. Tweak filters on the tool or add mounts you&apos;re
            missing.
          </p>
        ) : (
          <ol className="weekly-plan-list">
            {plan.map((m) => (
              <li key={m.id}>
                <span className="weekly-plan-list__name">{m.name}</span>
                <span className="weekly-plan-list__meta">
                  {" "}
                  — #{m.id}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
