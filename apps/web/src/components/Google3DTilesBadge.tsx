"use client";

interface Google3DTilesBadgeProps {
  status: "disabled" | "missing-key" | "ready";
}

export function Google3DTilesBadge({ status }: Google3DTilesBadgeProps) {
  if (status === "disabled") return null;

  if (status === "ready") {
    return (
      <div className="tiles-badge tiles-badge--ready" role="status" aria-live="polite">
        <span className="tiles-badge__label">3D</span>
        <span className="tiles-badge__hint">Photorealistic tiles active</span>
      </div>
    );
  }

  return (
    <div className="tiles-badge tiles-badge--scaffold" role="status" aria-live="polite">
      <span className="tiles-badge__label">3D scaffold</span>
      <span className="tiles-badge__hint">
        Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for buildings · 2D pitch fallback
      </span>
    </div>
  );
}
