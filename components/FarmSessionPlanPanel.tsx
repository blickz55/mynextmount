"use client";

import {
  SESSION_BUDGET_PRESETS_MIN,
  type FarmSessionPlan,
  type SessionBudgetPreset,
} from "@/lib/farmSessionPlan";

type Props = {
  plan: FarmSessionPlan;
  budgetMinutes: SessionBudgetPreset;
  onBudgetChange: (minutes: SessionBudgetPreset) => void;
};

export function FarmSessionPlanPanel({
  plan,
  budgetMinutes,
  onBudgetChange,
}: Props) {
  if (plan.includedMounts.length === 0) {
    return null;
  }

  return (
    <section
      className="session-plan-panel"
      aria-labelledby="session-plan-heading"
    >
      <h3 id="session-plan-heading" className="session-plan-panel__title">
        Suggested farm session
      </h3>
      <p className="session-plan-panel__intro">
        Built from the <strong>top</strong> of your sorted list, grouped by{" "}
        <strong>expansion</strong> and <strong>zone</strong> (catalog location
        line). Minutes are summed from each mount&apos;s{" "}
        <strong>time to complete</strong> field (heuristic, not lockout-aware).
      </p>
      <div className="session-plan-panel__budget">
        <span id="session-budget-label" className="session-plan-panel__budget-label">
          Time budget
        </span>
        <div
          className="session-plan-panel__budget-buttons"
          role="group"
          aria-labelledby="session-budget-label"
        >
          {SESSION_BUDGET_PRESETS_MIN.map((m) => (
            <button
              key={m}
              type="button"
              className={
                budgetMinutes === m
                  ? "btn-primary session-plan-panel__budget-btn"
                  : "btn-secondary session-plan-panel__budget-btn"
              }
              onClick={() => onBudgetChange(m)}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
      {plan.exceedsBudget ? (
        <p className="session-plan-panel__warn" role="status">
          The next mount on your list needs longer than this budget alone — it&apos;s
          still shown so you have a starting point.
        </p>
      ) : null}
      <div className="session-plan-panel__routes">
        {plan.routeGroups.map((g) => (
          <article
            key={`${g.expansion}|${g.zoneLabel}|${g.mounts.map((x) => x.id).join(",")}`}
            className="session-plan-route"
          >
            <header className="session-plan-route__head">
              <span className="session-plan-route__expansion">{g.expansion}</span>
              <span className="session-plan-route__sep" aria-hidden>
                ·
              </span>
              <span className="session-plan-route__zone">{g.zoneLabel}</span>
              <span className="session-plan-route__subtotal">
                ~{g.totalMinutes} min in this zone
              </span>
            </header>
            <ul className="session-plan-route__list">
              {g.mounts.map((m) => (
                <li key={m.id}>
                  <span className="session-plan-route__name">{m.name}</span>
                  <span className="session-plan-route__meta">
                    {" "}
                    — spell {m.id}, ~{Math.max(1, m.timeToComplete)} min
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="session-plan-panel__total" role="status">
        Session total: <strong>~{plan.totalMinutes} min</strong> (budget{" "}
        {plan.budgetMinutes} min)
      </p>
    </section>
  );
}
