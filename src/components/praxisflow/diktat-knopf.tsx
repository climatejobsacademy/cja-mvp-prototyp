"use client";

// Nur Demo – Audio wird vom Browser-Anbieter verarbeitet, für Pilot Datenschutzprüfung nötig.
// Web Speech API (lang de-DE): Chrome und Safari schicken das Audio an ihren
// Spracherkennungsdienst. Ohne API (z. B. Firefox) wird der Knopf nicht angezeigt.

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { diktatZuTexten } from "@/lib/praxisflow-logik";
import { cn } from "@/lib/utils";

import { SEKUNDAER } from "./stile";

// Minimaltypen: lib.dom von TypeScript enthält SpeechRecognition selbst nicht.
type ErgebnisListe = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
type Erkenner = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ErgebnisListe }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type ErkennerKlasse = new () => Erkenner;

function erkennerKlasse(): ErkennerKlasse | null {
  try {
    const w = window as unknown as { SpeechRecognition?: ErkennerKlasse; webkitSpeechRecognition?: ErkennerKlasse };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  } catch {
    return null;
  }
}

export type DiktatTexte = { starten: string; stoppen: string; hoertZu: string; verweigert: string; fehler: string };

/**
 * Mikrofon-Knopf für einen Listen-Editor: jeder erkannte Satz geht als eigener
 * Text an `onTexte`. Zustand "hört zu" am Knopf, erneuter Klick stoppt.
 * Fehler (Mikrofon verweigert, Dienst nicht erreichbar) als kurze Meldung;
 * Tippen funktioniert immer weiter.
 */
export function DiktatKnopf({
  einzahl,
  texte,
  onTexte,
}: {
  einzahl: string;
  texte: DiktatTexte;
  onTexte: (texte: string[]) => void;
}) {
  // Der Flow rendert nur im Browser, window ist hier vorhanden.
  const [Klasse] = useState(erkennerKlasse);
  const [hoert, setHoert] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const erkenner = useRef<Erkenner | null>(null);
  const onTexteRef = useRef(onTexte);

  useEffect(() => {
    onTexteRef.current = onTexte;
  });

  // Beim Verlassen des Unterschritts: Erkennung sofort beenden.
  useEffect(() => () => erkenner.current?.abort(), []);

  if (!Klasse) return null;
  const KlasseVorhanden = Klasse;

  function starten() {
    setMeldung(null);
    try {
      const r = new KlasseVorhanden();
      r.lang = "de-DE";
      r.continuous = true;
      r.interimResults = false;
      r.onresult = (e) => {
        const neu: string[] = [];
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const ergebnis = e.results[i];
          if (ergebnis.isFinal) neu.push(...diktatZuTexten(ergebnis[0].transcript));
        }
        if (neu.length > 0) onTexteRef.current(neu);
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") setMeldung(texte.verweigert);
        else if (e.error !== "no-speech" && e.error !== "aborted") setMeldung(texte.fehler);
      };
      r.onend = () => {
        erkenner.current = null;
        setHoert(false);
      };
      r.start();
      erkenner.current = r;
      setHoert(true);
    } catch {
      erkenner.current = null;
      setHoert(false);
      setMeldung(texte.fehler);
    }
  }

  function stoppen() {
    try {
      erkenner.current?.stop();
    } catch {
      erkenner.current = null;
      setHoert(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={hoert ? stoppen : starten}
        aria-pressed={hoert}
        aria-label={hoert ? `${texte.hoertZu} ${texte.stoppen}` : `${einzahl} ${texte.starten.toLowerCase()}`}
        className={cn(SEKUNDAER, hoert && "border-brand")}
      >
        {hoert ? (
          <>
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-brand" aria-hidden="true" />
            {texte.hoertZu}
            <Square aria-hidden="true" />
            {texte.stoppen}
          </>
        ) : (
          <>
            <Mic aria-hidden="true" />
            {texte.starten}
          </>
        )}
      </button>
      <span role="status" className={meldung ? "text-sm text-muted-foreground sm:basis-full" : "sr-only"}>
        {meldung ?? (hoert ? texte.hoertZu : "")}
      </span>
    </>
  );
}
