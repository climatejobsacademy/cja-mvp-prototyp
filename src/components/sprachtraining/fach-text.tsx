"use client";

import { Fragment } from "react";

import { SPRACHTRAINING_DEMO } from "@/lib/demo-schalter";
import { FACHBEGRIFFE } from "@/lib/sprachtraining-daten";

import { WortPanel } from "./wort-panel";

// Fachbegriffe zum Antippen (SR-24, Sprachtraining-Demo, nur demo): bekannte
// Begriffe im Text sind gepunktet unterstrichen; Antippen öffnet ein Panel
// von rechts mit Bild, Erklärung in einfacher Sprache und 🔊 (WortPanel).

/** Wort ohne Satzzeichen, klein geschrieben, als Schlüssel für FACHBEGRIFFE. */
const schluessel = (wort: string) => wort.toLocaleLowerCase("de-DE").replace(/[^\p{L}]/gu, "");

export function FachText({ text }: { text: string }) {
  // Außerhalb der Demo nur der Text, ohne antippbare Begriffe (demo-schalter.ts).
  if (!SPRACHTRAINING_DEMO) return <>{text}</>;
  // Wörter und Zwischenräume getrennt halten, damit der Text unverändert bleibt.
  const teile = text.split(/(\s+|\/)/);
  return (
    <>
      {teile.map((teil, i) => {
        const eintrag = FACHBEGRIFFE[schluessel(teil)];
        if (!eintrag) return <Fragment key={i}>{teil}</Fragment>;
        return (
          <WortPanel
            key={i}
            begriff={eintrag.begriff}
            erklaerung={eintrag.erklaerung}
            beispiel={eintrag.beispiel}
            bild={eintrag.bild}
            ausloeserLabel={`${teil}: Erklärung anzeigen`}
            ausloeserKlasse="cursor-help rounded-sm underline decoration-current/50 decoration-dotted decoration-2 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-brand"
          >
            {teil}
          </WortPanel>
        );
      })}
    </>
  );
}
