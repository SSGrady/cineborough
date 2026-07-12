"use client";

interface Google3DTilesBadgeProps {
  status: "disabled" | "missing-key" | "ready";
}

export function Google3DTilesBadge({ status }: Google3DTilesBadgeProps) {
  if (status === "disabled" || status === "ready") return null;

  return (
    <div className="tiles-badge" role="status" aria-live="polite">
      <span className="tiles-badge__label">3D tiles</span>
      <span className="tiles-badge__hint">
        Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> — using 2D pitch fallback
      </span>
    </div>
  );
}
