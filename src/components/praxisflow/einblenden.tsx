"use client";

import type { ReactNode } from "react";

/**
 * Nächster Schritt in einer Phase: blendet weich von unten ein und scrollt
 * sanft ins Bild (Anna 2026-10-12: Call-to-Actions "ploppen nacheinander
 * auf"). Ohne Animation bei "Bewegung reduzieren".
 */
// Feste Funktion (nicht inline), damit React sie nur beim Erscheinen aufruft
// und nicht bei jedem neuen Rendern erneut scrollt.
function insBild(el: HTMLDivElement | null) {
  if (!el) return;
  const bewegungAus = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: bewegungAus ? "auto" : "smooth", block: "nearest" });
}

export function Einblenden({ children }: { children: ReactNode }) {
  return (
    <div
      ref={insBild}
      className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-3 duration-300 motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
