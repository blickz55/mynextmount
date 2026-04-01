import Link from "next/link";
import type { Metadata } from "next";

import { ShellTopbar } from "@/components/ShellTopbar";
import { listRetailUnobtainableMounts } from "@/lib/listRetailUnobtainableMounts";
import { mounts } from "@/lib/mounts";

export const metadata: Metadata = {
  title: "Retail unobtainable (reference)",
  description:
    "Reference list of World of Warcraft mounts this catalog marks as not obtainable in current Retail.",
};

export default function RetailUnobtainableReferencePage() {
  const rows = listRetailUnobtainableMounts(mounts);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="app-main app-shell retail-unobtainable-page"
    >
      <ShellTopbar />
      <section className="content-section">
        <p className="retail-unobtainable-page__back">
          <Link href="/tool">← Back to tool</Link>
        </p>
        <h1 className="section-title">Retail unobtainable mounts</h1>
        <p className="retail-unobtainable-page__intro">
          These entries have{" "}
          <code className="inline-code">retailObtainable: false</code> in the
          merged catalog. They are excluded from farm recommendations and use
          unobtainable copy where the UI supports it. Data can still be wrong
          after a patch — verify in-game or on Wowhead.
        </p>
        <p className="retail-unobtainable-page__meta" role="status">
          <strong>{rows.length}</strong> mount
          {rows.length === 1 ? "" : "s"} in this build.
        </p>
        <div className="account-table-wrap retail-unobtainable-page__table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th scope="col">Mount</th>
                <th scope="col">Spell ID</th>
                <th scope="col">Curated stamp</th>
                <th scope="col">Wowhead</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>
                    <code className="inline-code">{m.id}</code>
                  </td>
                  <td>
                    {m.asOfPatch ? (
                      <code className="inline-code">{m.asOfPatch}</code>
                    ) : (
                      <span className="retail-unobtainable-page__na">—</span>
                    )}
                  </td>
                  <td>
                    {m.wowheadUrl ? (
                      <a
                        href={m.wowheadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="retail-unobtainable-page__wh-link"
                      >
                        Spell
                      </a>
                    ) : (
                      <span className="retail-unobtainable-page__na">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="retail-unobtainable-page__maintainer-hint">
          Maintainers: how this list is produced is documented in{" "}
          <code className="inline-code">docs/retail-unobtainable-mounts.md</code>
          .
        </p>
      </section>
    </main>
  );
}
