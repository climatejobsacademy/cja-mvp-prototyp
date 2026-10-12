"use client";

import { useState, useSyncExternalStore } from "react";

import { fotoAbonnieren, fotoLesen } from "@/lib/eigenes-foto";
import { cn } from "@/lib/utils";

// Profilbild (Anna 2026-10-12, SR folgt): Foto, wenn es eins gibt, sonst
// Initialen auf ruhiger Farbfläche -- so wirkt nichts kaputt, wenn ein Foto
// fehlt oder nicht lädt. `eigenes` zeigt das im Browser gespeicherte Foto der
// angemeldeten Person (src/lib/eigenes-foto.ts, nur Demo).

export type AvatarGroesse = "xs" | "sm" | "md" | "lg" | "xl";

const GROESSE: Record<AvatarGroesse, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-[13px]",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
};

export function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  if (teile.length === 0) return "?";
  return ((teile[0][0] ?? "") + (teile.length > 1 ? teile[teile.length - 1][0] : "")).toUpperCase();
}

const nichts = () => () => {};

export function Avatar({
  name,
  foto,
  eigenes,
  groesse = "md",
  className,
  flaeche = "bg-brand-tint text-brand",
}: {
  name: string;
  foto?: string | null;
  /** Eigenes, im Browser gespeichertes Foto zeigen (falls vorhanden) */
  eigenes?: boolean;
  groesse?: AvatarGroesse;
  className?: string;
  /** Farbfläche hinter den Initialen */
  flaeche?: string;
}) {
  const eigenesFoto = useSyncExternalStore(eigenes ? fotoAbonnieren : nichts, () => (eigenes ? fotoLesen() : null), () => null);
  const quelle = (eigenes ? eigenesFoto : null) ?? foto ?? null;
  const [kaputt, setKaputt] = useState<string | null>(null);
  const zeigeFoto = !!quelle && kaputt !== quelle;
  return (
    <span
      aria-hidden="true"
      className={cn("relative flex flex-none items-center justify-center overflow-hidden rounded-full font-semibold", GROESSE[groesse], !zeigeFoto && flaeche, className)}
    >
      {zeigeFoto ? (
        // Kleine Bilder aus public/ bzw. data:-URL -- next/image bringt hier nichts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={quelle}
          alt=""
          className="size-full object-cover"
          onError={() => setKaputt(quelle)}
          // Fehler vor dem Hydrieren verpasst onError -- dann hier nachholen.
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) setKaputt(quelle);
          }}
        />
      ) : (
        initialen(name)
      )}
    </span>
  );
}
