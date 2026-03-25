"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MountIcon } from "@/components/MountIcon";
import {
  MountFarmSecondaryDetails,
  MountRarestSecondaryDetails,
} from "@/components/MountRowSecondaryDetails";
import { OwnedMountsCollection } from "@/components/OwnedMountsCollection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildRecommendationReason } from "@/lib/buildRecommendationReason";
import { getMountLocationLabel } from "@/lib/getMountLocationLabel";
import { filterUnownedMounts } from "@/lib/filterUnownedMounts";
import { mounts } from "@/lib/mounts";
import {
  anySourceFilterEnabled,
  getMountSourceBucket,
  initialSourceFiltersAllOn,
  SOURCE_FILTER_OPTIONS,
  type SourceBucketId,
} from "@/lib/mountSourceBucket";
import { parseMountExport } from "@/lib/parseMountExport";
import { scoreEasiest } from "@/lib/scoreEasiest";
import { scoreRarest } from "@/lib/scoreRarest";
import { selectTopOwnedByRarest } from "@/lib/selectTopOwnedByRarest";
import { sortMountsByScore } from "@/lib/selectTopMountsByScore";
import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

const PAGE_SIZE = 10;

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

export default function HomePage() {
  const [exportString, setExportString] = useState("");
  const [mode, setMode] = useState<RecommendationMode>("easiest");
  const [parsedIds, setParsedIds] = useState<number[] | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [ownedRarestShowcase, setOwnedRarestShowcase] = useState<
    Mount[] | null
  >(null);
  const [sourceFilters, setSourceFilters] = useState(initialSourceFiltersAllOn);
  const [visibleFarmCount, setVisibleFarmCount] = useState(PAGE_SIZE);
  const resultsRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const unownedMounts = useMemo(() => {
    if (parsedIds === null) return [];
    return filterUnownedMounts(mounts, parsedIds);
  }, [parsedIds]);

  const filteredUnowned = useMemo(() => {
    if (!anySourceFilterEnabled(sourceFilters)) return [];
    return unownedMounts.filter((m) => sourceFilters[getMountSourceBucket(m)]);
  }, [unownedMounts, sourceFilters]);

  const scoreFn = mode === "easiest" ? scoreEasiest : scoreRarest;

  const sortedFarmList = useMemo(
    () => sortMountsByScore(filteredUnowned, scoreFn),
    [filteredUnowned, mode],
  );

  const visibleFarm = useMemo(
    () => sortedFarmList.slice(0, visibleFarmCount),
    [sortedFarmList, visibleFarmCount],
  );

  useEffect(() => {
    setVisibleFarmCount(PAGE_SIZE);
  }, [parsedIds, mode, sourceFilters]);

  useEffect(() => {
    if (parsedIds === null || sortedFarmList.length === 0) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [parsedIds]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || visibleFarmCount >= sortedFarmList.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleFarmCount((c) =>
            Math.min(c + PAGE_SIZE, sortedFarmList.length),
          );
        }
      },
      { root: null, rootMargin: "120px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleFarmCount, sortedFarmList.length]);

  const toggleSourceFilter = useCallback((id: SourceBucketId) => {
    setSourceFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSubmit = useCallback(() => {
    try {
      const result = parseMountExport(exportString);
      if (result.ok) {
        setInputError(null);
        setParsedIds(result.ids);
        setOwnedRarestShowcase(
          selectTopOwnedByRarest(mounts, result.ids, 10),
        );
      } else {
        setInputError(result.error);
        setParsedIds(null);
        setOwnedRarestShowcase(null);
      }
    } catch (err) {
      setInputError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setParsedIds(null);
      setOwnedRarestShowcase(null);
    }
  }, [exportString]);

  const filtersActive = anySourceFilterEnabled(sourceFilters);
  const showFarmSection = parsedIds !== null;
  const unownedEmpty = parsedIds !== null && unownedMounts.length === 0;

  return (
    <main className="app-main app-shell">
      <div className="shell-topbar">
        <ThemeToggle />
      </div>
      <header className="site-brand" aria-label="MyNextMount">
        {brandLogoUrl !== "" && (
          <img
            className="site-brand__logo"
            src={brandLogoUrl}
            alt="MyNextMount"
            decoding="async"
            loading="lazy"
          />
        )}
        <h1 className="site-title">
          My<span className="site-title-accent">Next</span>Mount
        </h1>
        <p className="site-tagline">What to farm next — mynextmount.com</p>
      </header>

      <section className="how-to-panel" aria-label="How to export your mounts">
        <h2 className="how-to-panel__title">How to get your export</h2>
        <ol className="how-to-panel__list">
          <li>
            Install the <strong>MyNextMount</strong> addon through your favorite
            addon installer, such as{" "}
            <a
              href="https://www.curseforge.com/wow/addons"
              target="_blank"
              rel="noopener noreferrer"
            >
              CurseForge
            </a>
            .
          </li>
          <li>
            Launch WoW and enable <strong>MyNextMount</strong> on the AddOns
            list.
          </li>
          <li>
            Type <code className="how-to-panel__cmd">/mountexport</code> or{" "}
            <code className="how-to-panel__cmd">/mynextmount</code> into your
            chat bar.
          </li>
          <li>
            Copy and paste results from the in-game pop-up into the box below.
            The string looks like{" "}
            <code className="how-to-panel__cmd">M:65645,59961,41256</code>.
          </li>
        </ol>
      </section>

      <p className="lead">
        Paste your export here (summon spell IDs — same format the addon copies).
      </p>
      <label htmlFor="export" className="field-label">
        Export string
      </label>
      <textarea
        id="export"
        className="input-textarea"
        value={exportString}
        onChange={(e) => setExportString(e.target.value)}
        rows={4}
        placeholder="M:65645,59961,41256"
      />
      <fieldset className="mode-fieldset">
        <legend>Mode</legend>
        <label>
          <input
            type="radio"
            name="recommendation-mode"
            value="easiest"
            checked={mode === "easiest"}
            onChange={() => setMode("easiest")}
          />
          Easiest
        </label>
        <label>
          <input
            type="radio"
            name="recommendation-mode"
            value="rarest"
            checked={mode === "rarest"}
            onChange={() => setMode("rarest")}
          />
          Rarest
        </label>
      </fieldset>
      <p className="mode-hint" aria-live="polite">
        Using:{" "}
        <strong>{mode === "easiest" ? "Easiest" : "Rarest"}</strong>{" "}
        recommendations
      </p>
      <button type="button" className="btn-primary" onClick={handleSubmit}>
        Find My Mounts
      </button>
      {inputError !== null && (
        <p className="alert-error" role="alert">
          {inputError}
        </p>
      )}
      {parsedIds !== null && (
        <>
          <p className="status-block" role="status" aria-live="polite">
            Submitted {parsedIds.length}{" "}
            {parsedIds.length === 1 ? "mount" : "mounts"}.
          </p>
          <details className="disclosure-block owned-mounts-disclosure">
            <summary>View Your Mounts ({parsedIds.length})</summary>
            <div className="disclosure-block__body disclosure-block__body--scroll">
              <OwnedMountsCollection
                parsedIds={parsedIds}
                catalog={mounts}
              />
            </div>
          </details>
          {ownedRarestShowcase !== null && (
            <>
              {ownedRarestShowcase.length === 0 ? (
                <section
                  className="content-section"
                  aria-label="Your rarest mounts"
                >
                  <h2 className="section-title">Your rarest mounts</h2>
                  <p className="status-block">
                    None of your exported spell IDs match a mount in this
                    site&apos;s data yet. Run{" "}
                    <code className="inline-code">npm run data:merge-stubs</code>{" "}
                    after pasting your export into{" "}
                    <code className="inline-code">
                      fixtures/my-collection-export.txt
                    </code>{" "}
                    (writes{" "}
                    <code className="inline-code">data/mounts.stubs.json</code>,
                    not <code className="inline-code">mounts.json</code>).
                  </p>
                </section>
              ) : (
                <details
                  className="rarest-showcase-disclosure"
                  aria-label="Your rarest mounts"
                >
                  <summary>
                    <span className="rarest-showcase-disclosure__summary-text">
                      <span className="rarest-showcase-disclosure__title">
                        Your rarest mounts
                      </span>
                      <span className="rarest-showcase-disclosure__cta">
                        Tap to expand — top 10 you own by the same
                        &quot;rarest&quot; score (for fun, not farming advice)
                      </span>
                    </span>
                  </summary>
                  <div className="rarest-showcase-disclosure__body">
                    <p className="section-intro">
                      Names and locations stay visible in each row; summarized
                      tips and the full Wowhead thread are one tap away under each
                      mount.
                    </p>
                    <div className="results-stack">
                      <ol className="mount-results-list">
                        {ownedRarestShowcase.map((mount) => (
                          <li key={mount.id} className="mount-result-card">
                            <div className="mount-result-card__head">
                              <MountIcon mount={mount} />
                              <strong>{mount.name}</strong>
                              <span className="mount-result-card__meta">
                                — {getMountLocationLabel(mount)}
                              </span>
                            </div>
                            <MountRarestSecondaryDetails mount={mount} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </details>
              )}
            </>
          )}
          {showFarmSection && (
            <section
              ref={resultsRef}
              className="content-section"
              aria-label="Results"
            >
              <h2 className="section-title">Top mounts to farm</h2>
              <p className="section-intro">
                Each row shows the decision line first (where, boss, why). Open
                the section below for the written guide, source link,
                summarized community tips, and the full Wowhead comments link.
                Scroll down to load more in batches of {PAGE_SIZE}.
              </p>

              <fieldset className="source-filter-fieldset">
                <legend className="source-filter-fieldset__legend">
                  Filter by how mounts are obtained
                </legend>
                <div className="source-filter-grid">
                  {SOURCE_FILTER_OPTIONS.map(({ id, label }) => (
                    <label key={id} className="source-filter-option">
                      <input
                        type="checkbox"
                        checked={sourceFilters[id]}
                        onChange={() => toggleSourceFilter(id)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {!filtersActive && (
                <p className="source-filter-prompt" role="status">
                  Select at least one source filter above to see farm
                  recommendations.
                </p>
              )}

              {filtersActive && unownedEmpty && (
                <p className="status-block">
                  No unowned mounts left in this dataset.
                </p>
              )}

              {filtersActive && !unownedEmpty && sortedFarmList.length === 0 && (
                <p className="status-block">
                  No mounts match your selected filters. Try turning more
                  sources on.
                </p>
              )}

              {filtersActive && visibleFarm.length > 0 && (
                <>
                  <p className="farm-count-hint" aria-live="polite">
                    Showing {visibleFarm.length} of {sortedFarmList.length}{" "}
                    mount{sortedFarmList.length === 1 ? "" : "s"}
                  </p>
                  <div className="results-stack">
                    <ol className="mount-results-list">
                      {visibleFarm.map((mount) => (
                        <li key={mount.id} className="mount-result-card">
                          <div className="mount-result-card__head">
                            <MountIcon mount={mount} />
                            <strong>{mount.name}</strong>
                          </div>
                          <div className="mount-result-card__line">
                            Location: {getMountLocationLabel(mount)}
                          </div>
                          {mount.boss !== undefined && mount.boss !== "" && (
                            <div className="mount-result-card__line">
                              Boss: {mount.boss}
                            </div>
                          )}
                          <div className="mount-result-card__line">
                            Why: {buildRecommendationReason(mount, mode)}
                          </div>
                          <MountFarmSecondaryDetails mount={mount} />
                        </li>
                      ))}
                    </ol>
                    {visibleFarmCount < sortedFarmList.length && (
                      <div
                        ref={loadMoreSentinelRef}
                        className="infinite-scroll-sentinel"
                        aria-hidden
                      />
                    )}
                    {visibleFarmCount >= sortedFarmList.length &&
                      sortedFarmList.length > PAGE_SIZE && (
                        <p className="farm-end-hint">End of list</p>
                      )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
