"use client";

import { useEffect, useState } from "react";
import type { DiscoveryCriteria } from "@cineborough/data";
import { DEFAULT_DISCOVERY_CRITERIA } from "@cineborough/data";
import { StoryDrawer } from "./StoryDrawer";

interface DiscoveryCriteriaPanelProps {
  open: boolean;
  criteria: DiscoveryCriteria;
  resetCriteria?: DiscoveryCriteria;
  onClose: () => void;
  onApply: (criteria: DiscoveryCriteria) => void;
}

function formatBudget(value: number): string {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(2)}M`
    : `${Math.round(value / 1000)}k`;
}

export function DiscoveryCriteriaPanel({
  open,
  criteria,
  resetCriteria = DEFAULT_DISCOVERY_CRITERIA,
  onClose,
  onApply,
}: DiscoveryCriteriaPanelProps) {
  const [draft, setDraft] = useState<DiscoveryCriteria>(criteria);

  useEffect(() => {
    if (open) setDraft(criteria);
  }, [open, criteria]);

  const update = <K extends keyof DiscoveryCriteria>(key: K, value: DiscoveryCriteria[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    const normalized: DiscoveryCriteria = {
      ...draft,
      budgetMin: Math.min(draft.budgetMin, draft.budgetMax),
      budgetMax: Math.max(draft.budgetMin, draft.budgetMax),
    };
    onApply(normalized);
    onClose();
  };

  return (
    <StoryDrawer open={open} title="Discovery criteria" onClose={onClose}>
      <p className="discovery-criteria__intro">
        Set your hybrid filters — financial upside plus hope-core livability. Criteria persist for
        this session and feed the scoring engine.
      </p>

      <fieldset className="discovery-criteria__group">
        <legend>Budget range</legend>
        <div className="discovery-criteria__range">
          <label>
            Min ($)
            <input
              type="number"
              min={0}
              step={10_000}
              value={draft.budgetMin}
              onChange={(e) => update("budgetMin", Number(e.target.value))}
            />
            <span className="discovery-criteria__hint">{formatBudget(draft.budgetMin)}</span>
          </label>
          <label>
            Max ($)
            <input
              type="number"
              min={0}
              step={10_000}
              value={draft.budgetMax}
              onChange={(e) => update("budgetMax", Number(e.target.value))}
            />
            <span className="discovery-criteria__hint">{formatBudget(draft.budgetMax)}</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="discovery-criteria__group">
        <legend>Financial filters</legend>
        <label>
          Min cap rate (%)
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={draft.minCapRate}
            onChange={(e) => update("minCapRate", Number(e.target.value))}
          />
        </label>
        <label>
          Max overvaluation (%)
          <input
            type="number"
            min={-50}
            max={100}
            step={0.5}
            value={draft.maxOvervaluationPct}
            onChange={(e) => update("maxOvervaluationPct", Number(e.target.value))}
          />
        </label>
      </fieldset>

      <fieldset className="discovery-criteria__group">
        <legend>Hope-core filters</legend>
        <label>
          Min walkability (0–100)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={draft.minWalkability}
            onChange={(e) => update("minWalkability", Number(e.target.value))}
          />
        </label>
        <label>
          Min remote work (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={draft.minRemoteWorkPct}
            onChange={(e) => update("minRemoteWorkPct", Number(e.target.value))}
          />
        </label>
      </fieldset>

      <div className="discovery-criteria__actions">
        <button type="button" className="discovery-criteria__reset" onClick={() => setDraft(resetCriteria)}>
          Reset defaults
        </button>
        <button type="button" className="discovery-criteria__apply" onClick={handleApply}>
          Apply criteria
        </button>
      </div>
    </StoryDrawer>
  );
}
