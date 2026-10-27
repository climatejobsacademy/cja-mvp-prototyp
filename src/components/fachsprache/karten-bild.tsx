"use client";

import { Maximize2 } from "lucide-react";

import { ZoomFenster } from "@/components/bild-zoom";

import type { SeitenBild } from "@/lib/fachsprache-laden";

// Fachsprache-Einheit (Stufe 2, SR-84): Bild steht direkt auf der Karte und
// lässt sich per Klick groß öffnen und zoomen (Entscheidung O5, Zoom 2026-10-27). Der
// Alternativtext ist Pflicht im Inhalt (0051) und steht am Bild und im Fenster.
// Das Bild kommt über einen kurzlebigen signierten Link vom Server; bewusst ein
// einfaches <img>, damit der Link nicht durch den Bildoptimierer von Next
// zwischengespeichert wird.

export function KartenBild({ bild }: { bild: SeitenBild }) {
  // Klick aufs Bild öffnet es groß mit Zoom (Anna 2026-10-27); vorher ein
  // eigener Knopf mit Fenster ohne Zoom.
  return (
    <figure className="overflow-hidden rounded-xl bg-white">
      <ZoomFenster src={bild.url} alt={bild.alt}>
        <span className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bild.url} alt={bild.alt} className="mx-auto max-h-64 w-auto max-w-full object-contain" />
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-full bg-white text-self shadow-card"
          >
            <Maximize2 className="size-5" />
          </span>
        </span>
      </ZoomFenster>
    </figure>
  );
}
