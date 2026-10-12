"use client";

// Nur Demo – Audio wird vom Browser-Anbieter verarbeitet, für Pilot Datenschutzprüfung nötig.
// Web Speech API (lang de-DE): Chrome und Safari schicken das Audio an ihren
// Spracherkennungsdienst. Ohne API (z. B. Firefox) ist `verfuegbar` false.

import { useEffect, useRef, useState } from "react";

import { diktatZuTexten } from "@/lib/praxisflow-logik";

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

export type DiktatMeldungen = { verweigert: string; fehler: string };

/**
 * Diktat per Antippen starten und erneut antippen zum Stoppen. Jeder erkannte
 * Satz geht als eigener Text an `onTexte`. Fehler (Mikrofon verweigert,
 * Dienst nicht erreichbar) landen in `meldung`; nichts davon wirft.
 */
export function useDiktat(onTexte: (texte: string[]) => void, meldungen: DiktatMeldungen) {
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

  function starten() {
    if (!Klasse) return;
    setMeldung(null);
    try {
      const r = new Klasse();
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
        if (e.error === "not-allowed" || e.error === "service-not-allowed") setMeldung(meldungen.verweigert);
        else if (e.error !== "no-speech" && e.error !== "aborted") setMeldung(meldungen.fehler);
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
      setMeldung(meldungen.fehler);
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

  return { verfuegbar: Klasse !== null, hoert, meldung, starten, stoppen };
}
