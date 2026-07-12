"use client";

import type { ReactNode } from "react";

interface CinematicMotionProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
  staggerSec?: number;
}

export function CinematicMotion({
  children,
  active = false,
  className = "",
  staggerSec = 0.07,
}: CinematicMotionProps) {
  return (
    <div
      className={`cinematic-motion${active ? " cinematic-motion--active" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--motion-stagger": `${staggerSec}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
