"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FarmRecommendationsList } from "@/components/FarmRecommendationsList";
import { MountIcon } from "@/components/MountIcon";
import { MountRarestSecondaryDetails } from "@/components/MountRowSecondaryDetails";
import { CollectionToolbar } from "@/components/CollectionToolbar";
import { HowToExportPanel } from "@/components/HowToExportPanel";
import { OwnedMountsCollection } from "@/components/OwnedMountsCollection";
import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";
import { getMountLocationLabel } from "@/lib/getMountLocationLabel";
import {
  filterMountsByFarmSearchQuery,
  mountMatchesFarmSearchQuery,
} from "@/lib/farmListSearch";
import { filterUnownedMounts } from "@/lib/filterUnownedMounts";
import { filterMountsEligibleForFarmRecommendations } from "@/lib/mountFarmEligibility";
import { mounts } from "@/lib/mounts";
import {
  anySourceFilterEnabled,
  getMountSourceBucket,
  initialSourceFiltersDefault,
  SOURCE_FILTER_OPTIONS,
  type SourceBucketId,
} from "@/lib/mountSourceBucket";
import { parseMountExport } from "@/lib/parseMountExport";
import { recommendationScorer } from "@/lib/scoring";
import { selectTopOwnedByRarest } from "@/lib/selectTopOwnedByRarest";
import { sortMountsByScore } from "@/lib/selectTopMountsByScore";
import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

const PAGE_SIZE = 10;
const FARM_SEARCH_DEBOUNCE_MS = 250;
const CATALOG_QA_MAX_RESULTS = 100;

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

export default function HomePage() {
  const [exportString, setExportString] = useState("");
  const [mode, setMode] = useState<RecommendationMode>("efficient");
  const [parsedIds, setParsedIds] = useState<number[] | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [ownedRarestShowcase, setOwnedRarestShowcase] = useState<
    Mount[] | null
  >(null);
  const [sourceFilters, setSourceFilters] = useState(initialSourceFiltersDefault);
  const [visibleFarmCount, setVisibleFarmCount] = useState(PAGE_SIZE);
  const [farmSearchInput, setFarmSearchInput] = useState("");
  const [debouncedFarmSearch, setDebouncedFarmSearch] = useState("");
  const [catalogSearchInput, setCatalogSearchInput] = useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("");
  const resultsRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const unownedMounts = useMemo(() => {
    if (parsedIds === null) return [];
    return filterUnownedMounts(mounts, parsedIds);
  }, [parsedIds]);

  const farmableUnownedMounts = useMemo(
    () => filterMountsEligibleForFarmRecommendations(unownedMounts),
    [unownedMounts],
  );

  const filteredUnowned = useMemo(() => {
    if (!anySourceFilterEnabled(sourceFilters)) return [];
    return farmableUnownedMounts.filter(
      (m) => sourceFilters[getMountSourceBucket(m)],
    );
  }, [farmableUnownedMounts, sourceFilters]);

  const scoreFn = useMemo(() => recommendationScorer(mode), [mode]);

  const sortedFarmList = useMemo(
    () => sortMountsByScore(filteredUnowned, scoreFn),
    [filteredUnowned, scoreFn],
  );

  const searchFilteredFarmList = useMemo(
    () => filterMountsByFarmSearchQuery(sortedFarmList, debouncedFarmSearch),
    [sortedFarmList, debouncedFarmSearch],
  );

  const catalogQaMatches = useMemo(() => {
    const q = debouncedCatalogSearch.trim();
    if (!q) return [];
    return mounts
      .filter((m) => mountMatchesFarmSearchQuery(m, q))
      .slice(0, CATALOG_QA_MAX_RESULTS);
  }, [debouncedCatalogSearch]);

  const visibleFarm = useMemo(
    () => searchFilteredFarmList.slice(0, visibleFarmCount),
    [searchFilteredFarmList, visibleFarmCount],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedFarmSearch(farmSearchInput.trim());
    }, FARM_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [farmSearchInput]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearchInput.trim());
    }, FARM_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [catalogSearchInput]);

  useEffect(() => {
    setFarmSearchInput("");
  }, [parsedIds]);

  useEffect(() => {
    setVisibleFarmCount(PAGE_SIZE);
  }, [parsedIds, mode, sourceFilters, debouncedFarmSearch]);

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
  }, [parsedIds, sortedFarmList.length]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || visibleFarmCount >= searchFilteredFarmList.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleFarmCount((c) =>
            Math.min(c + PAGE_SIZE, searchFilteredFarmList.length),
          );
        }
      },
      { root: null, rootMargin: "120px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleFarmCount, searchFilteredFarmList.length]);

  const toggleSourceFilter = useCallback((id: SourceBucketId) => {
    setSourceFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const applyParsedIds = useCallback((ids: number[]) => {
    setExportString(`M:${ids.join(",")}`);
    setInputError(null);
    setParsedIds(ids);
    setOwnedRarestShowcase(selectTopOwnedByRarest(mounts, ids, 10));
  }, []);

  const handleSubmit = useCallback(() => {
    try {
      const result = parseMountExport(exportString);
      if (result.ok) {
        applyParsedIds(result.ids);
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
  }, [exportString, applyParsedIds]);

  const filtersActive = anySourceFilterEnabled(sourceFilters);
  const showFarmSection = parsedIds !== null;
  const unownedEmpty = parsedIds !== null && unownedMounts.length === 0;
  const allUnownedMarkedUnobtainable =
    parsedIds !== null &&
    unownedMounts.length > 0 &&
    farmableUnownedMounts.length === 0;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="app-main app-shell"
    >
      <ShellTopbar
        mission={
          <>
            Every collection tells a story. Find the mounts that bring you
            closer to completing yours. MyNextMount was created to help mount
            lovers farm more mounts.
          </>
        }
      />
      <SiteBrand brandLogoUrl={brandLogoUrl} />

      <HowToExportPanel />

      <p className="lead" id="export-hint">
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
        autoComplete="off"
        spellCheck={false}
        aria-describedby={
          inputError !== null ? "export-hint export-error" : "export-hint"
        }
        aria-invalid={inputError !== null}
      />
      <fieldset className="mode-fieldset">
        <legend>Mode</legend>
        <label>
          <input
            type="radio"
            name="recommendation-mode"
            value="efficient"
            checked={mode === "efficient"}
            onChange={() => setMode("efficient")}
          />
          Efficient (EV-style)
        </label>
        <label>
          <input
            type="radio"
            name="recommendation-mode"
            value="balanced"
            checked={mode === "balanced"}
            onChange={() => setMode("balanced")}
          />
          Balanced
        </label>
        <label>
          <input
            type="radio"
            name="recommendation-mode"
            value="rarest"
            checked={mode === "rarest"}
            onChange={() => setMode("rarest")}
          />
          Rarest prestige
        </label>
      </fieldset>
      <p className="mode-hint" aria-live="polite">
        Using:{" "}
        <strong>
          {mode === "efficient"
            ? "Efficient (EV-style)"
            : mode === "balanced"
              ? "Balanced"
              : "Rarest prestige"}
        </strong>{" "}
        recommendations
      </p>
      <button type="button" className="btn-primary" onClick={handleSubmit}>
        Find My Mounts
      </button>
      {inputError !== null && (
        <p className="alert-error" id="export-error" role="alert">
          {inputError}
        </p>
      )}
      <CollectionToolbar
        parsedIds={parsedIds}
        onApplyParsedIds={applyParsedIds}
      />
      {parsedIds !== null && (
        <>
          <p className="status-block" role="status" aria-live="polite">
            Submitted {parsedIds.length}{" "}
            {parsedIds.length === 1 ? "mount" : "mounts"}.
          </p>
          <details className="disclosure-block owned-mounts-disclosure">
            <summary>
              <span className="sr-only">Owned collection: </span>
              View Your Mounts ({parsedIds.length})
            </summary>
            <div className="disclosure-block__body">
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
                              {mount.retailObtainable === false ? (
                                <span className="mount-result-card__unobtainable">
                                  No longer obtainable
                                </span>
                              ) : null}
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
                <p className="source-filter-fieldset__hint">
                  In-Game Shop starts <strong>unchecked</strong> (opt-in); turn
                  it on if you want shop mounts in the list.
                </p>
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
                <p
                  className="source-filter-prompt"
                  role="status"
                  aria-live="polite"
                >
                  Select at least one source filter above to see farm
                  recommendations.
                </p>
              )}

              {filtersActive && unownedEmpty && (
                <p className="status-block" role="status" aria-live="polite">
                  No unowned mounts left in this dataset.
                </p>
              )}

              {filtersActive && allUnownedMarkedUnobtainable && (
                <p className="status-block" role="status" aria-live="polite">
                  You still have unowned mounts in the catalog, but every one
                  is marked{" "}
                  <strong>no longer obtainable</strong> in Retail (curated
                  list). Nothing to farm from this dataset.
                </p>
              )}

              {filtersActive &&
                !unownedEmpty &&
                !allUnownedMarkedUnobtainable &&
                sortedFarmList.length === 0 && (
                  <p className="status-block" role="status" aria-live="polite">
                    No mounts match your selected filters. Try turning more
                    sources on.
                  </p>
                )}

              {filtersActive && sortedFarmList.length > 0 && (
                <details className="disclosure-block farm-list-search-disclosure">
                  <summary>
                    <span className="sr-only">Farm list: </span>
                    Filter by name or spell ID
                  </summary>
                  <div className="disclosure-block__body">
                    <label
                      htmlFor="farm-list-search"
                      className="field-label farm-list-search__label"
                    >
                      Narrows the sorted list below (same source filters).
                    </label>
                    <input
                      id="farm-list-search"
                      type="search"
                      enterKeyHint="search"
                      className="farm-list-search__input"
                      value={farmSearchInput}
                      onChange={(e) => setFarmSearchInput(e.target.value)}
                      placeholder="Mount name or spell ID…"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </details>
              )}

              {filtersActive &&
                sortedFarmList.length > 0 &&
                debouncedFarmSearch &&
                searchFilteredFarmList.length === 0 && (
                  <p
                    className="status-block"
                    role="status"
                    aria-live="polite"
                  >
                    No mounts match &quot;{debouncedFarmSearch}&quot;. Clear the
                    filter above to see all {sortedFarmList.length} mounts in
                    this view.
                  </p>
                )}

              {filtersActive && searchFilteredFarmList.length > 0 && (
                <>
                  <p className="farm-count-hint" aria-live="polite">
                    Showing {visibleFarm.length} of{" "}
                    {searchFilteredFarmList.length}
                    {" "}
                    mount{searchFilteredFarmList.length === 1 ? "" : "s"}
                    {debouncedFarmSearch ? (
                      <>
                        {" "}
                        matching &quot;{debouncedFarmSearch}&quot;
                      </>
                    ) : null}
                  </p>
                  <div className="results-stack">
                    <FarmRecommendationsList mounts={visibleFarm} mode={mode} />
                    {visibleFarmCount < searchFilteredFarmList.length && (
                      <>
                        <p className="load-more-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              setVisibleFarmCount((c) =>
                                Math.min(
                                  c + PAGE_SIZE,
                                  searchFilteredFarmList.length,
                                ),
                              )
                            }
                          >
                            Load more mounts (
                            {searchFilteredFarmList.length - visibleFarmCount}{" "}
                            remaining)
                          </button>
                        </p>
                        <div
                          ref={loadMoreSentinelRef}
                          className="infinite-scroll-sentinel"
                          aria-hidden
                        />
                      </>
                    )}
                    {visibleFarmCount >= searchFilteredFarmList.length &&
                      searchFilteredFarmList.length > PAGE_SIZE && (
                        <p
                          className="farm-end-hint"
                          role="status"
                          aria-live="polite"
                        >
                          End of list
                        </p>
                      )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      <details className="disclosure-block catalog-qa-search-disclosure">
        <summary>
          <span className="sr-only">Maintainer: </span>
          Search full catalog (QA)
        </summary>
        <div className="disclosure-block__body">
          <p className="catalog-qa-search__hint">
            Find any mount by name or summon spell ID without pasting an export.
            Up to {CATALOG_QA_MAX_RESULTS} results.
          </p>
          <label
            htmlFor="catalog-qa-search"
            className="field-label catalog-qa-search__label"
          >
            Catalog search
          </label>
          <input
            id="catalog-qa-search"
            type="search"
            enterKeyHint="search"
            className="farm-list-search__input catalog-qa-search__input"
            value={catalogSearchInput}
            onChange={(e) => setCatalogSearchInput(e.target.value)}
            placeholder="Mount name or spell ID…"
            autoComplete="off"
            spellCheck={false}
          />
          {debouncedCatalogSearch && catalogQaMatches.length === 0 && (
            <p className="status-block" role="status" aria-live="polite">
              No catalog matches for &quot;{debouncedCatalogSearch}&quot;.
            </p>
          )}
          {catalogQaMatches.length > 0 && (
            <ul
              className="catalog-qa-search__results"
              role="list"
              aria-label="Catalog search results"
            >
              {catalogQaMatches.map((m) => (
                <li key={m.id} className="catalog-qa-search__row">
                  <span className="catalog-qa-search__name">{m.name}</span>
                  <span className="catalog-qa-search__spell">
                    {" "}
                    (spell {m.id})
                  </span>
                  {m.wowheadUrl?.trim() ? (
                    <a
                      className="catalog-qa-search__link"
                      href={m.wowheadUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Wowhead
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </main>
  );
}
