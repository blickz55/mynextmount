import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth-session";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";
import { mounts } from "@/lib/mounts";
import { prisma } from "@/lib/prisma";
import { deserializeSpellIds } from "@/lib/savedCollection";
import { computeWeeklyPlanMounts } from "@/lib/weeklyPlan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "My collection",
  description:
    "Saved mount export, completion stats, and weekly farm suggestions for MyNextMount.",
};

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

function expansionRows(
  catalog: typeof mounts,
  ownedSet: Set<number>,
): { expansion: string; owned: number; total: number }[] {
  const map = new Map<string, { owned: number; total: number }>();
  for (const m of catalog) {
    if (m.retailObtainable === false) continue;
    const ex = (m.expansion || "Unknown").trim() || "Unknown";
    const row = map.get(ex) ?? { owned: 0, total: 0 };
    row.total += 1;
    if (ownedSet.has(m.id)) row.owned += 1;
    map.set(ex, row);
  }
  const rows = [...map.entries()].map(([expansion, v]) => ({
    expansion,
    ...v,
  }));
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      collectionSpellIds: true,
      collectionUpdatedAt: true,
    },
  });
  if (!user) {
    redirect("/login");
  }

  const owned = deserializeSpellIds(
    typeof user.collectionSpellIds === "string" ? user.collectionSpellIds : "",
  );
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
  const expansions = expansionRows(mounts, ownedSet).slice(0, 12);

  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SiteBrand brandLogoUrl={brandLogoUrl} />
      <h1 className="section-title">My collection</h1>
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
        <p className="status-block">
          <Link href="/tool">Open the tool</Link> — use{" "}
          <strong>Load saved collection</strong> after signing in.
        </p>
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

      <section className="content-section" aria-labelledby="exp-heading">
        <h2 id="exp-heading" className="section-title account-section-heading">
          By expansion (Retail catalog)
        </h2>
        <div className="account-table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th scope="col">Expansion</th>
                <th scope="col">Collected</th>
                <th scope="col">In catalog</th>
              </tr>
            </thead>
            <tbody>
              {expansions.map((row) => (
                <tr key={row.expansion}>
                  <td>{row.expansion}</td>
                  <td>{row.owned}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
