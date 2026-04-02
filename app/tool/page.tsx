"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FarmRecommendationsList,
  type FarmAttemptRowStats,
} from "@/components/FarmRecommendationsList";
import { MountIcon } from "@/components/MountIcon";
import { MountRarestOwnedPanel } from "@/components/MountRarestOwnedPanel";
import { CollectionToolbar } from "@/components/CollectionToolbar";
import {
  HowToExportCompact,
  HowToExportPanel,
} from "@/components/HowToExportPanel";
import { OwnedMountsCollection } from "@/components/OwnedMountsCollection";
import { ShellTopbar } from "@/components/ShellTopbar";
import {
  SmartSiteBrand,
  TOOL_ENGAGED_KEY,
} from "@/components/SmartSiteBrand";
import {
  filterMountsByFarmSearchQuery,
  mountMatchesFarmSearchQuery,
} from "@/lib/farmListSearch";
import { filterUnownedMounts } from "@/lib/filterUnownedMounts";
import { filterMountsEligibleForFarmRecommendations } from "@/lib/mountFarmEligibility";
import { computeCollectionProgressStats } from "@/lib/collectionProgressStats";
import { mounts } from "@/lib/mounts";
import {
  FARM_ATTEMPT_LOOKUP_MAX_IDS,
  K_ATTEMPT_INCREMENT_CAP,
} from "@/lib/farmAttemptConstants";
import {
  anySourceFilterEnabled,
  initialSourceFiltersDefault,
  mountPassesFarmableModeAcquisition,
  mountPassesSourceFilters,
  SOURCE_FILTER_OPTIONS,
  type SourceBucketId,
} from "@/lib/mountSourceBucket";
import { parseMountExport } from "@/lib/parseMountExport";
import {
  delegatesMountPasteToNativeControl,
  tryParsePastedMountExport,
} from "@/lib/tryParsePastedMountExport";
import {
  clientFarmScoringPersonalizationFromRows,
  parseCommunityBoostBySpellIdJson,
} from "@/lib/clientFarmScoringPersonalization";
import { deriveFarmBehaviorSignals } from "@/lib/farmPreferenceModel";
import {
  clearFarmPreferenceStored,
  FARM_PREF_CHANGED_EVENT,
  loadFarmPreferenceStored,
} from "@/lib/farmPreferenceStorage";
import {
  recommendationScorer,
  type ScoringContext,
} from "@/lib/scoring";
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

const highlightBannerUrl =
  typeof process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL === "string"
    ? process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL.trim()
    : "";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const [exportString, setExportString] = useState("");
  const [mode, setMode] = useState<RecommendationMode>("efficient");
  const [parsedIds, setParsedIds] = useState<number[] | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [ownedRarestShowcase, setOwnedRarestShowcase] = useState<
    Mount[] | null
  >(null);
  const [sourceFilters, setSourceFilters] = useState(() =>
    initialSourceFiltersDefault(),
  );
  const [visibleFarmCount, setVisibleFarmCount] = useState(PAGE_SIZE);
  const [farmSearchInput, setFarmSearchInput] = useState("");
  const [debouncedFarmSearch, setDebouncedFarmSearch] = useState("");
  const [catalogSearchInput, setCatalogSearchInput] = useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("");
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const exportStringRef = useRef(exportString);
  const [remoteSavedCount, setRemoteSavedCount] = useState<number | null>(null);
  const [accountFetchSettled, setAccountFetchSettled] = useState(false);
  const [farmAttemptsBySpellId, setFarmAttemptsBySpellId] = useState<
    Readonly<Record<number, FarmAttemptRowStats>> | null
  >(null);
  const [nextWeeklyResetAt, setNextWeeklyResetAt] = useState<string | null>(
    null,
  );
  const [communityBoostBySpellId, setCommunityBoostBySpellId] = useState<
    Record<number, number> | null
  >(null);
  const [farmPrefVersion, setFarmPrefVersion] = useState(0);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  /** Signed-in: “Replace collection with new addon export” panel. */
  const [authExportUpdateOpen, setAuthExportUpdateOpen] = useState(false);

  useEffect(() => {
    exportStringRef.current = exportString;
  }, [exportString]);

  useEffect(() => {
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    const onPrefs = () => setFarmPrefVersion((v) => v + 1);
    window.addEventListener(FARM_PREF_CHANGED_EVENT, onPrefs);
    return () => window.removeEventListener(FARM_PREF_CHANGED_EVENT, onPrefs);
  }, []);

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
    return farmableUnownedMounts.filter((m) => {
      if (!mountPassesSourceFilters(m, sourceFilters)) return false;
      if (mode === "efficient" && !mountPassesFarmableModeAcquisition(m)) {
        return false;
      }
      return true;
    });
  }, [farmableUnownedMounts, sourceFilters, mode]);

  const baselineScoreFn = useMemo(() => recommendationScorer(mode), [mode]);

  const prelimSortedFarmList = useMemo(
    () => sortMountsByScore(filteredUnowned, baselineScoreFn),
    [filteredUnowned, baselineScoreFn],
  );

  const farmDataFetchIds = useMemo(
    () =>
      prelimSortedFarmList
        .slice(0, FARM_ATTEMPT_LOOKUP_MAX_IDS)
        .map((m) => m.id),
    [prelimSortedFarmList],
  );

  const farmDataSpellIdsKey = useMemo(
    () => farmDataFetchIds.join(","),
    [farmDataFetchIds],
  );

  const scoringContext = useMemo<ScoringContext | undefined>(() => {
    const behavior = prefsHydrated
      ? deriveFarmBehaviorSignals(loadFarmPreferenceStored())
      : undefined;
    const farmReady =
      sessionStatus === "authenticated" &&
      farmAttemptsBySpellId !== null &&
      nextWeeklyResetAt !== null &&
      nextWeeklyResetAt !== "" &&
      communityBoostBySpellId !== null;
    const farmPart = farmReady
      ? clientFarmScoringPersonalizationFromRows({
          farmAttemptsBySpellId: farmAttemptsBySpellId!,
          nextWeeklyResetAt: nextWeeklyResetAt!,
          communityBoostBySpellId: communityBoostBySpellId!,
        })
      : null;

    if (!farmPart && !behavior) return undefined;

    return {
      personalization: {
        ...(farmPart ?? {}),
        ...(behavior ? { behavior } : {}),
      },
    };
  }, [
    sessionStatus,
    farmAttemptsBySpellId,
    nextWeeklyResetAt,
    communityBoostBySpellId,
    farmPrefVersion,
    prefsHydrated,
  ]);

  const scoreFn = useMemo(
    () => recommendationScorer(mode, scoringContext),
    [mode, scoringContext],
  );

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

  const collectionSaveContext = useMemo(
    () => ({
      recommendationMode: mode,
      sourceFilters,
      farmSearchQuery: debouncedFarmSearch,
    }),
    [mode, sourceFilters, debouncedFarmSearch],
  );

  const collectionProgress = useMemo(() => {
    if (parsedIds === null || parsedIds.length === 0) {
      return null;
    }
    return computeCollectionProgressStats(parsedIds, mounts);
  }, [parsedIds]);

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
    if (sessionStatus !== "authenticated") {
      setRemoteSavedCount(null);
      setAccountFetchSettled(false);
      setFarmAttemptsBySpellId(null);
      setNextWeeklyResetAt(null);
      setCommunityBoostBySpellId(null);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }
    const ids =
      farmDataSpellIdsKey === ""
        ? []
        : farmDataSpellIdsKey
            .split(",")
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      setFarmAttemptsBySpellId({});
      setNextWeeklyResetAt(null);
      setCommunityBoostBySpellId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/collection/farm-attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spellIds: ids }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          nextWeeklyResetAt?: string;
          communityBoostBySpellId?: Record<string, number>;
          bySpellId?: Record<
            string,
            {
              attempts: number;
              lastAttemptAt: string | null;
              pSeenDropPct: number | null;
              lockout?: {
                kind: "none" | "daily" | "weekly";
                state: "available" | "locked";
                unlocksAt: string | null;
              };
            }
          >;
        };
        if (!res.ok || cancelled) return;
        const next: Record<number, FarmAttemptRowStats> = {};
        for (const [k, v] of Object.entries(data.bySpellId ?? {})) {
          next[Number(k)] = {
            attempts: v.attempts,
            lastAttemptAt: v.lastAttemptAt,
            pSeenDropPct: v.pSeenDropPct,
            lockout: v.lockout ?? {
              kind: "none",
              state: "available",
              unlocksAt: null,
            },
          };
        }
        if (!cancelled) {
          setFarmAttemptsBySpellId(next);
          setNextWeeklyResetAt(
            typeof data.nextWeeklyResetAt === "string"
              ? data.nextWeeklyResetAt
              : null,
          );
          setCommunityBoostBySpellId(
            parseCommunityBoostBySpellIdJson(data.communityBoostBySpellId),
          );
        }
      } catch {
        if (!cancelled) {
          setFarmAttemptsBySpellId({});
          setNextWeeklyResetAt(null);
          setCommunityBoostBySpellId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, farmDataSpellIdsKey]);

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
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOOL_ENGAGED_KEY, "1");
      }
    } catch {
      /* ignore */
    }
    setExportString(`M:${ids.join(",")}`);
    setInputError(null);
    setParsedIds(ids);
    setOwnedRarestShowcase(selectTopOwnedByRarest(mounts, ids, 10));
    setAuthExportUpdateOpen(false);
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }
    let cancelled = false;
    (async () => {
      const stripLoadSavedParam = () => {
        if (typeof window === "undefined") return;
        const u = new URL(window.location.href);
        if (!u.searchParams.has("loadSaved")) return;
        u.searchParams.delete("loadSaved");
        const q = u.searchParams.toString();
        window.history.replaceState(
          {},
          "",
          `${u.pathname}${q ? `?${q}` : ""}${u.hash}`,
        );
      };

      const forceLoadSaved =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("loadSaved") === "1";

      try {
        const res = await fetch("/api/collection");
        const data = (await res.json().catch(() => ({}))) as {
          spellIds?: number[];
        };
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setRemoteSavedCount(0);
          return;
        }
        const ids = Array.isArray(data.spellIds) ? data.spellIds : [];
        setRemoteSavedCount(ids.length);
        if (ids.length === 0) {
          stripLoadSavedParam();
          return;
        }
        if (forceLoadSaved) {
          applyParsedIds(ids);
          stripLoadSavedParam();
          return;
        }
        const trimmed = exportStringRef.current.trim();
        if (trimmed !== "") {
          try {
            const probe = parseMountExport(trimmed);
            if (probe.ok && probe.ids.length > 0) {
              return;
            }
          } catch {
            /* fall through to hydrate */
          }
        }
        applyParsedIds(ids);
      } catch {
        if (!cancelled) {
          setRemoteSavedCount(0);
        }
      } finally {
        if (!cancelled) {
          setAccountFetchSettled(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, applyParsedIds]);

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

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (delegatesMountPasteToNativeControl(e.target)) {
        return;
      }
      const text = e.clipboardData?.getData("text/plain");
      if (!text || !/\S/.test(text)) {
        return;
      }
      const parsed = tryParsePastedMountExport(text);
      if (!parsed) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      applyParsedIds(parsed.ids);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [applyParsedIds]);

  const filtersActive = anySourceFilterEnabled(sourceFilters);
  const showFarmSection = parsedIds !== null;
  const unownedEmpty = parsedIds !== null && unownedMounts.length === 0;
  const allUnownedMarkedUnobtainable =
    parsedIds !== null &&
    unownedMounts.length > 0 &&
    farmableUnownedMounts.length === 0;

  const isAuthenticated = sessionStatus === "authenticated";
  const authCollectionLoading = isAuthenticated && !accountFetchSettled;
  const showGuestExportHeader =
    !isAuthenticated ||
    (isAuthenticated && accountFetchSettled && parsedIds === null);
  const showStreamlinedCollection =
    isAuthenticated && parsedIds !== null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="app-main app-shell"
    >
      <ShellTopbar />
      <SmartSiteBrand
        brandLogoUrl={brandLogoUrl}
        showMission
        highlightBannerUrl={highlightBannerUrl}
      />

      {authCollectionLoading ? (
        <p className="status-block collection-dashboard__loading" role="status">
          Loading your mounts…
        </p>
      ) : null}

      {showStreamlinedCollection ? (
        <section
          className="collection-dashboard content-section"
          aria-labelledby="collection-dashboard-title"
        >
          <header className="collection-dashboard__head">
            <h2
              id="collection-dashboard-title"
              className="section-title collection-dashboard__title"
            >
              Your Mount Collection
            </h2>
            <p
              className="collection-dashboard__subtitle"
              id="mnm-collection-anchor"
            >
              <strong>{parsedIds!.length}</strong>{" "}
              {parsedIds!.length === 1 ? "mount" : "mounts"} saved on this
              account
              {collectionProgress !== null ? (
                <>
                  {" "}
                  —{" "}
                  <strong>{collectionProgress.percentComplete}%</strong> of the
                  mounts we still count as gettable in Retail
                </>
              ) : null}
              .{" "}
              <Link href="/account" className="collection-dashboard__account-link">
                Account &amp; region
              </Link>
            </p>
          </header>

          <CollectionToolbar
            parsedIds={parsedIds}
            onApplyParsedIds={applyParsedIds}
            remoteSavedCount={remoteSavedCount}
            accountFetchSettled={accountFetchSettled}
            saveContext={collectionSaveContext}
          />

          {collectionProgress !== null ? (
            <aside
              className="collection-progress-k7 collection-dashboard__progress"
              aria-label="Collection completion"
            >
              <p className="collection-progress-k7__lead">
                <strong>{collectionProgress.matchedObtainable}</strong> of{" "}
                <strong>{collectionProgress.obtainableTotal}</strong> mounts you
                can still get —{" "}
                <strong>{collectionProgress.percentComplete}%</strong> done.
              </p>
              <p className="field-hint collection-progress-k7__hint">
                “Still gettable” is our call for current Retail — not a guarantee
                Blizzard agrees with. Your line has{" "}
                <strong>{collectionProgress.storedSpellCount}</strong> mount
                {collectionProgress.storedSpellCount === 1 ? "" : "s"}.
                {collectionProgress.unknownSpellIdCount > 0 ? (
                  <>
                    {" "}
                    <strong>{collectionProgress.unknownSpellIdCount}</strong>{" "}
                    didn&apos;t match anything we list (removed mount, typo, or
                    we&apos;re missing data).
                  </>
                ) : null}
              </p>
              <p className="collection-progress-k7__ref">
                <Link
                  href="/tool/retail-unobtainable"
                  className="collection-progress-k7__ref-link"
                >
                  Mounts we mark as gone from Retail
                </Link>
              </p>
            </aside>
          ) : null}

          <div className="collection-dashboard__grid-wrap">
            <OwnedMountsCollection parsedIds={parsedIds!} catalog={mounts} />
          </div>

          <details
            className="disclosure-block collection-update-export-disclosure"
            open={authExportUpdateOpen}
            onToggle={(e) => {
              const open = e.currentTarget.open;
              setAuthExportUpdateOpen(open);
              if (open) {
                setExportString("");
                setInputError(null);
              }
            }}
          >
            <summary className="collection-update-export-disclosure__summary">
              <span className="collection-update-export-disclosure__title">
                Update my collection from the game
              </span>
              <span className="collection-update-export-disclosure__hint">
                New mounts? Run /mnm and paste here
              </span>
            </summary>
            <div className="disclosure-block__body collection-update-export-disclosure__body">
              <p className="collection-update-export-disclosure__lead">
                Only open this when you want a fresh copy from WoW. In game, run{" "}
                <code className="inline-code">/mnm</code> and paste the line it
                prints.
              </p>
              <HowToExportCompact />
              <label
                htmlFor="export-auth-update"
                className="field-label"
              >
                Paste your new M:… line
              </label>
              <textarea
                id="export-auth-update"
                className="input-textarea collection-update-export-disclosure__textarea"
                value={exportString}
                onChange={(e) => setExportString(e.target.value)}
                rows={5}
                placeholder="M:65645,59961,41256"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={
                  inputError !== null
                    ? "export-auth-hint export-error"
                    : "export-auth-hint"
                }
                aria-invalid={inputError !== null}
              />
              <p className="field-hint" id="export-auth-hint">
                Apply updates what you see here. Hit{" "}
                <strong>Save to my account</strong> above if you want it stored
                on your login.
              </p>
              <div className="collection-update-export-disclosure__actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmit}
                >
                  Apply paste
                </button>
              </div>
              {inputError !== null ? (
                <p className="alert-error" id="export-error" role="alert">
                  {inputError}
                </p>
              ) : null}
            </div>
          </details>
        </section>
      ) : null}

      {showGuestExportHeader ? (
        <>
          <HowToExportPanel />

          <p className="lead" id="export-hint">
            {isAuthenticated
              ? "Paste your /mnm line below to load your mounts. When it looks right, use Save to my account."
              : "Paste your /mnm line from WoW below."}
          </p>
          <label htmlFor="export" className="field-label">
            Addon output (type /mnm in game)
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
        </>
      ) : null}

      {!authCollectionLoading &&
      (showGuestExportHeader || showStreamlinedCollection) ? (
        <>
      <fieldset className="mode-fieldset">
        <legend>Mode</legend>
        <div className="mode-fieldset__inner">
          <span className="mode-fieldset__option-row">
            <label htmlFor="recommendation-mode-efficient">
              <input
                id="recommendation-mode-efficient"
                type="radio"
                name="recommendation-mode"
                value="efficient"
                checked={mode === "efficient"}
                onChange={() => setMode("efficient")}
              />
              <span className="mode-fieldset__label-text">Farmable</span>
            </label>
            <button
              type="button"
              className="mode-fieldset__info"
              title={
                "Farmable = stuff you can grind: world/dungeon/raid drops or buying from an NPC. " +
                "That includes rep and currency vendors (Blizzard calls those “vendor” too). " +
                "Hidden here: quests, achievements, shop, trading post, promos, prof crafts, TCG, holidays, secrets, and the rest."
              }
              aria-label="What Farmable mode includes"
            >
              i
            </button>
          </span>
          <label>
            <input
              type="radio"
              name="recommendation-mode"
              value="balanced"
              checked={mode === "balanced"}
              onChange={() => setMode("balanced")}
            />
            <span className="mode-fieldset__label-text">Balanced</span>
          </label>
          <label>
            <input
              type="radio"
              name="recommendation-mode"
              value="rarest"
              checked={mode === "rarest"}
              onChange={() => setMode("rarest")}
            />
            <span className="mode-fieldset__label-text">Rarest first</span>
          </label>
        </div>
      </fieldset>
      <p className="mode-hint" aria-live="polite">
        Sorted with:{" "}
        <strong>
          {mode === "efficient"
            ? "Farmable (drops & vendors)"
            : mode === "balanced"
              ? "Balanced"
              : "Rarest first"}
        </strong>
      </p>
      </>
      ) : null}

      {!authCollectionLoading && showGuestExportHeader ? (
        <>
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            Load my mounts
          </button>
          {inputError !== null ? (
            <p className="alert-error" id="export-error" role="alert">
              {inputError}
            </p>
          ) : null}
        </>
      ) : null}

      {!showStreamlinedCollection ? (
        <CollectionToolbar
          parsedIds={parsedIds}
          onApplyParsedIds={applyParsedIds}
          remoteSavedCount={remoteSavedCount}
          accountFetchSettled={accountFetchSettled}
          saveContext={collectionSaveContext}
        />
      ) : null}
      {parsedIds !== null && (
        <>
          {!showStreamlinedCollection ? (
            <>
              <p
                id="mnm-collection-anchor"
                className="status-block"
                role="status"
                aria-live="polite"
              >
                Loaded {parsedIds.length}{" "}
                {parsedIds.length === 1 ? "mount" : "mounts"}.
              </p>
              {collectionProgress !== null ? (
                <aside
                  className="collection-progress-k7"
                  aria-label="Collection completion"
                >
                  <p className="collection-progress-k7__lead">
                    <strong>{collectionProgress.matchedObtainable}</strong> of{" "}
                    <strong>{collectionProgress.obtainableTotal}</strong> mounts
                    you can still get —{" "}
                    <strong>{collectionProgress.percentComplete}%</strong> done.
                  </p>
                  <p className="field-hint collection-progress-k7__hint">
                    “Still gettable” is our call for current Retail — not a guarantee
                    Blizzard agrees with. Your line has{" "}
                    <strong>{collectionProgress.storedSpellCount}</strong> mount
                    {collectionProgress.storedSpellCount === 1 ? "" : "s"}.
                    {collectionProgress.unknownSpellIdCount > 0 ? (
                      <>
                        {" "}
                        <strong>{collectionProgress.unknownSpellIdCount}</strong>{" "}
                        didn&apos;t match anything we list (removed mount, typo, or
                        we&apos;re missing data).
                      </>
                    ) : null}
                  </p>
                  <p className="collection-progress-k7__ref">
                    <Link
                      href="/tool/retail-unobtainable"
                      className="collection-progress-k7__ref-link"
                    >
                      Mounts we mark as gone from Retail
                    </Link>
                  </p>
                </aside>
              ) : null}
              <details className="disclosure-block owned-mounts-disclosure">
                <summary>
                  <span
                    className="owned-mounts-disclosure__bg"
                    aria-hidden="true"
                  />
                  <span className="owned-mounts-disclosure__label">
                    <span className="sr-only">Owned collection: </span>
                    Your mounts ({parsedIds.length})
                  </span>
                </summary>
                <div className="disclosure-block__body">
                  <OwnedMountsCollection
                    parsedIds={parsedIds}
                    catalog={mounts}
                  />
                </div>
              </details>
            </>
          ) : null}
          {ownedRarestShowcase !== null && (
            <>
              {ownedRarestShowcase.length === 0 ? (
                <section
                  className="content-section"
                  aria-label="Your rarest mounts"
                >
                  <h2 className="section-title">Your rarest mounts</h2>
                  <p className="status-block">
                    We couldn&apos;t match any of your mounts to our list yet.
                    Try a fresh <code className="inline-code">/mnm</code> paste,
                    or check back after the site updates its data.
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
                        Tap — your 10 rarest (by our score, just for bragging)
                      </span>
                    </span>
                  </summary>
                  <div className="rarest-showcase-disclosure__body">
                    <p className="section-intro">
                      Quick blurb, rarity score, and the same hover story you get
                      in your mount grid.
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
                                  Gone in Retail (our list)
                                </span>
                              ) : null}
                            </div>
                            <MountRarestOwnedPanel mount={mount} />
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
            <section className="content-section" aria-label="Results">
              <h2 className="section-title">Top mounts to farm</h2>
              <details className="disclosure-block tool-farm-help-disclosure">
                <summary>
                  <span className="tool-farm-help-disclosure__summary">
                    <span className="tool-farm-help-disclosure__summary-title">
                      What you&apos;re looking at
                    </span>
                    <span className="tool-farm-help-disclosure__summary-hint">
                      Tap — columns, saves, sorting
                    </span>
                  </span>
                </summary>
                <div className="disclosure-block__body tool-farm-help-disclosure__body">
                  <p>
                    Each card: where to go, what to do, and why it&apos;s on the
                    list.
                  </p>
                  <p>
                    <strong>Farm tries</strong> (logged-in): how often you hit{" "}
                    <strong>Save to my account</strong> while this mount was in
                    your top {K_ATTEMPT_INCREMENT_CAP} with the same mode, filters,
                    and search you have now. Saving the same list twice in a row
                    usually won&apos;t add another tick.
                  </p>
                  <p>
                    <strong>Est. saw a drop</strong>: rough guess from our drop %
                    and your tries — not a promise, just math on a napkin.
                  </p>
                  <p>
                    <strong>Lockout</strong>: daily or weekly wait after a save
                    that counted this mount. If the day looks wrong, set region on{" "}
                    <Link href="/account">My Mounts</Link>.
                  </p>
                  <p>
                    Logged in? We nudge mounts you&apos;re actively poking toward
                    the top. Everyone else gets the plain sort. We only pull try
                    stats for the first {FARM_ATTEMPT_LOOKUP_MAX_IDS} rows in your
                    current filter — tighten filters if your target is buried.
                  </p>
                  <p>
                    <strong>Quick steps &amp; Wowhead</strong> opens first;{" "}
                    <strong>Community</strong> is player notes. Scroll for more,{" "}
                    {PAGE_SIZE} at a time.
                  </p>
                </div>
              </details>

              <fieldset className="source-filter-fieldset">
                <legend className="source-filter-fieldset__legend">
                  How do you get it?
                </legend>
                <p className="source-filter-fieldset__hint">
                  <strong>Shop</strong>, <strong>Promo</strong>,{" "}
                  <strong>Marks of Honor</strong>, and{" "}
                  <strong>Halaa</strong> start <strong>off</strong> — turn them on
                  if you want those grinds. Halaa = Nagrand PvP token stuff when
                  our tips say so.
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
                  Pick at least one checkbox above or the list stays empty.
                </p>
              )}

              {filtersActive && unownedEmpty && (
                <p className="status-block" role="status" aria-live="polite">
                  You own everything we&apos;re showing. Nice.
                </p>
              )}

              {filtersActive && allUnownedMarkedUnobtainable && (
                <p className="status-block" role="status" aria-live="polite">
                  You&apos;re still missing some mounts, but every leftover one
                  is marked <strong>not gettable in Retail</strong> on our list —
                  so there&apos;s nothing left to &quot;farm&quot; here.
                </p>
              )}

              {filtersActive &&
                !unownedEmpty &&
                !allUnownedMarkedUnobtainable &&
                sortedFarmList.length === 0 && (
                  <p className="status-block" role="status" aria-live="polite">
                    Nothing matches those checkboxes. Try turning more on.
                  </p>
                )}

              {filtersActive && sortedFarmList.length > 0 && (
                <details className="disclosure-block farm-list-search-disclosure">
                  <summary>
                    <span className="sr-only">Farm list: </span>
                    Search this list
                  </summary>
                  <div className="disclosure-block__body">
                    <label
                      htmlFor="farm-list-search"
                      className="field-label farm-list-search__label"
                    >
                      Search within this list (filters still apply).
                    </label>
                    <input
                      id="farm-list-search"
                      type="search"
                      enterKeyHint="search"
                      className="farm-list-search__input"
                      value={farmSearchInput}
                      onChange={(e) => setFarmSearchInput(e.target.value)}
                      placeholder="Mount name or number…"
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
                    Nothing for &quot;{debouncedFarmSearch}&quot;. Clear the box
                    to see all {sortedFarmList.length} here.
                  </p>
                )}

              {filtersActive && searchFilteredFarmList.length > 0 && (
                <>
                  <p className="field-hint farm-pref-reset-hint">
                    <button
                      type="button"
                      className="farm-pref-reset-btn"
                      onClick={() => clearFarmPreferenceStored()}
                    >
                      Reset my sort tweaks
                    </button>{" "}
                    (this browser only — from opening Score on cards)
                  </p>
                  {/* Archived: Suggested farm session — FarmSessionPlanPanel + buildFarmSessionPlan (lib/farmSessionPlan.ts). */}
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
                    <FarmRecommendationsList
                      mounts={visibleFarm}
                      mode={mode}
                      farmAttemptsBySpellId={farmAttemptsBySpellId}
                      scoringContext={scoringContext}
                    />
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
                            Load more (
                            {searchFilteredFarmList.length - visibleFarmCount}{" "}
                            left)
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
          <span className="sr-only">Power user: </span>
          Search every mount (no export needed)
        </summary>
        <div className="disclosure-block__body">
          <p className="catalog-qa-search__hint">
            Hunt by name or ID. Shows up to {CATALOG_QA_MAX_RESULTS} hits.
          </p>
          <label
            htmlFor="catalog-qa-search"
            className="field-label catalog-qa-search__label"
          >
            Full catalog search
          </label>
          <input
            id="catalog-qa-search"
            type="search"
            enterKeyHint="search"
            className="farm-list-search__input catalog-qa-search__input"
            value={catalogSearchInput}
            onChange={(e) => setCatalogSearchInput(e.target.value)}
            placeholder="Mount name or number…"
            autoComplete="off"
            spellCheck={false}
          />
          {debouncedCatalogSearch && catalogQaMatches.length === 0 && (
            <p className="status-block" role="status" aria-live="polite">
              No hits for &quot;{debouncedCatalogSearch}&quot;.
            </p>
          )}
          {catalogQaMatches.length > 0 && (
            <ul
              className="catalog-qa-search__results"
              role="list"
              aria-label="Search results"
            >
              {catalogQaMatches.map((m) => (
                <li key={m.id} className="catalog-qa-search__row">
                  <span className="catalog-qa-search__name">{m.name}</span>
                  {m.retailObtainable === false ? (
                    <span className="catalog-qa-search__retired">
                      Gone in Retail (our list)
                    </span>
                  ) : null}
                  <span className="catalog-qa-search__spell">
                    {" "}
                    (ID {m.id})
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
