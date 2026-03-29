import Link from "next/link";
import type { Metadata } from "next";
import type { WeeklyResetCalendar } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountStaleSessionActions } from "@/components/AccountStaleSessionActions";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";
import { WeeklyResetCalendarPreference } from "@/components/WeeklyResetCalendarPreference";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
import { retryAsync } from "@/lib/retryAsync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Account settings",
  description:
    "Farm lockout timing, weekly reset calendar, and account data for MyNextMount.",
};

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const highlightBannerUrl =
  typeof process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL === "string"
    ? process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL.trim()
    : "";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
    redirect("/login?callbackUrl=/account/settings");
  }

  let user: {
    email: string;
    weeklyResetCalendar: WeeklyResetCalendar;
  } | null = null;
  let dbLoadFailed = false;
  try {
    user = await retryAsync(
      () => findAppUserFromSession(session.user),
      { retries: 2, delayMs: 400 },
    );
  } catch (e) {
    console.error("[account/settings] prisma.user.findUnique", e);
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
        <h2 className="section-title">Account settings</h2>
        <p className="lead">
          We couldn&apos;t load your account from the database. This is usually
          a temporary connection issue on the server.
        </p>
        <p className="status-block">
          <Link href="/account/settings">Try again</Link>
          {" · "}
          <Link href="/account">My Mounts</Link>
          {" · "}
          <Link href="/tool">Open the tool</Link>
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
        <h2 className="section-title">Account settings</h2>
        <p className="lead">
          Your browser session is active, but we could not find a matching
          account in the database.
        </p>
        <AccountStaleSessionActions />
        <p className="status-block">
          <Link href="/account">My Mounts</Link>
          {" · "}
          <Link href="/register">Create a new account</Link>
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SiteBrand
        brandLogoUrl={brandLogoUrl}
        showMission
        highlightBannerUrl={highlightBannerUrl}
        homeHref="/account"
      />
      <p className="account-settings__back">
        <Link href="/account">← My Mounts</Link>
      </p>
      <h2 className="section-title">Account settings</h2>
      <p className="lead">
        Signed in as <strong>{user.email}</strong>. Preferences here affect how
        weekly lockouts and farm timing are interpreted on the recommender.
      </p>

      <section
        className="content-section"
        aria-labelledby="lockout-calendar-heading"
      >
        <h2
          id="lockout-calendar-heading"
          className="section-title account-section-heading"
        >
          Farm lockout timing
        </h2>
        <WeeklyResetCalendarPreference initial={user.weeklyResetCalendar} />
      </section>

      <section
        className="content-section account-danger-zone"
        aria-labelledby="danger-heading"
      >
        <h2 id="danger-heading" className="section-title account-section-heading">
          Account data
        </h2>
        <p className="section-intro">
          Delete removes your email, password hash, saved spell list, snapshots,
          farm attempts, and related rows from this server.
        </p>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
