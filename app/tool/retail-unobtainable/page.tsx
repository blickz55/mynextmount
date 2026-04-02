import Link from "next/link";
import type { Metadata } from "next";

import { ShellTopbar } from "@/components/ShellTopbar";
import { listRetailUnobtainableMounts } from "@/lib/listRetailUnobtainableMounts";
import { mounts } from "@/lib/mounts";

export const metadata: Metadata = {
  title: "Gone from Retail (our list)",
  description:
    "World of Warcraft mounts we currently treat as not gettable in live Retail — for curiosity, not farming.",
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
        <h1 className="section-title">Mounts we call gone from Retail</h1>
        <p className="retail-unobtainable-page__intro">
          We hide these from the farm list and flag them elsewhere as “don’t
          chase this in live Retail.” Our call can be wrong after a patch —
          always verify in game or on Wowhead.
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
                <th scope="col">ID</th>
                <th scope="col">Patch note</th>
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
                        Open
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
      </section>
    </main>
  );
}
