"use client";

import type { ReactNode } from "react";

interface StoryDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function StoryDrawer({ open, title, onClose, children }: StoryDrawerProps) {
  if (!open) return null;

  return (
    <div className="story-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="story-drawer__backdrop"
        aria-label="Close details"
        onClick={onClose}
      />
      <div className="story-drawer__panel">
        <header className="story-drawer__header">
          <h2>{title}</h2>
          <button type="button" className="story-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="story-drawer__body">{children}</div>
      </div>
    </div>
  );
}
