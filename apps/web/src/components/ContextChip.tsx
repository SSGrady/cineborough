"use client";

interface ContextChipProps {
  title: string;
  detail?: string;
  stepLabel?: string;
  onOpenDrawer?: () => void;
  action?: { label: string; onClick: () => void };
}

export function ContextChip({ title, detail, stepLabel, onOpenDrawer, action }: ContextChipProps) {
  return (
    <div className="context-chip">
      {stepLabel && <span className="context-chip__step">{stepLabel}</span>}
      <button
        type="button"
        className="context-chip__main"
        onClick={onOpenDrawer}
        disabled={!onOpenDrawer}
        aria-label={onOpenDrawer ? `Open details: ${title}` : undefined}
      >
        <span className="context-chip__title">{title}</span>
        {detail && <span className="context-chip__detail">{detail}</span>}
      </button>
      {action && (
        <button type="button" className="context-chip__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
