"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, PartyPopper, RotateCcw, Sparkles } from "lucide-react";

import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

import { FOKUS, PRIMAER, TEXT, UEBERSCHRIFT } from "./stile";

// Spielerische Bausteine des Praxis-Flows (Vorschau Anna 2026-10-12, nur
// Demo): kleine Aufgaben mit sofortiger Rückmeldung, Fokus auf den
// aktuellen Schritt, "Etappe geschafft"-Momente. Farben wie überall: Lime =
// jetzt/geschafft-Moment, Lila = Auswahl/Häkchen, Coral = Praxis.

// ---------------------------------------------------------------------------
// Durchführen: Fokus-Modus -- der aktuelle Schritt groß, darunter die Liste

type Schritt = { id: string; text: string };
type Status = "abhakbar" | "zuruecknehmbar" | "erledigt" | "gesperrt";

export function FokusDurchfuehren({
  schritte,
  erledigt,
  status,
  onUmschalten,
}: {
  schritte: Schritt[];
  erledigt: string[];
  status: Record<string, Status>;
  onUmschalten: (id: string) => void;
}) {
  const aktuellIndex = schritte.findIndex((s) => !erledigt.includes(s.id));
  const aktuell = aktuellIndex >= 0 ? schritte[aktuellIndex] : null;
  const letzterErledigt = [...schritte].reverse().find((s) => status[s.id] === "zuruecknehmbar");
  const fertig = schritte.length > 0 && erledigt.length === schritte.length;
  return (
    <div className="flex flex-col gap-4">
      {aktuell ? (
        <div
          key={aktuell.id}
          className="flex flex-col gap-4 rounded-zeile bg-praxis-tint p-5 animate-in fade-in-0 slide-in-from-right-4 duration-300 motion-reduce:animate-none md:p-6"
        >
          <span className="self-start rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-on-lime">
            Schritt {aktuellIndex + 1} von {schritte.length}
          </span>
          <p className="text-[22px] leading-snug font-semibold text-ink md:text-[26px]">{aktuell.text}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onUmschalten(aktuell.id)}
              disabled={status[aktuell.id] !== "abhakbar"}
              className={PRIMAER}
            >
              Erledigt <Check aria-hidden="true" />
            </button>
            {letzterErledigt && (
              <button
                type="button"
                onClick={() => onUmschalten(letzterErledigt.id)}
                className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:text-ink", FOKUS)}
              >
                <RotateCcw className="size-4" aria-hidden="true" /> Letzten Schritt zurücknehmen
              </button>
            )}
          </div>
        </div>
      ) : (
        fertig && (
          <div className="flex items-center gap-3 rounded-zeile bg-praxis-tint p-5 animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">
            <span className="flex size-10 flex-none items-center justify-center rounded-full bg-lime text-on-lime">
              <Check className="size-5" strokeWidth={3} aria-hidden="true" />
            </span>
            <p className="text-[17px] font-semibold text-ink">Alle Schritte erledigt!</p>
          </div>
        )
      )}
      <ol className="flex flex-col gap-1.5" aria-label="Alle Arbeitsschritte">
        {schritte.map((s, i) => {
          const istErledigt = erledigt.includes(s.id);
          const istAktuell = i === aktuellIndex;
          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-[15px]",
                istAktuell ? "bg-subtle font-semibold text-ink" : istErledigt ? "text-ink-muted" : "text-ink-subtle"
              )}
            >
              <span
                className={cn(
                  "flex size-6 flex-none items-center justify-center rounded-full text-xs font-bold",
                  istErledigt ? "bg-brand text-white" : istAktuell ? "bg-lime text-on-lime" : "bg-subtle text-ink-muted"
                )}
                aria-hidden="true"
              >
                {istErledigt ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("min-w-0 break-words", istErledigt && "line-through decoration-ink/40")}>{s.text}</span>
              <span className="sr-only">{istErledigt ? " (erledigt)" : istAktuell ? " (jetzt)" : ""}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bewerten: Du vs. Trainer nebeneinander + Reflexion

export function BewertungVergleich({
  kriterien,
  selbst,
  fremd,
}: {
  kriterien: { id: string; titel: string }[];
  selbst: Record<string, number>;
  fremd: Record<string, number>;
}) {
  const [reflexion, setReflexion] = useState("");
  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <h3 className={UEBERSCHRIFT}>Du und die Trainer:in im Vergleich</h3>
      <ul className="flex flex-col gap-2">
        <li className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 text-xs font-semibold text-ink-muted" aria-hidden="true">
          <span>Kriterium</span>
          <span className="w-12 text-center">Du</span>
          <span className="w-16 text-center">Trainer:in</span>
        </li>
        {kriterien.map((k) => {
          const s = selbst[k.id];
          const f = fremd[k.id];
          const gleich = s === f;
          return (
            <li key={k.id} className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-zeile px-4 py-2.5", gleich ? "bg-subtle" : "bg-praxis-tint")}>
              <span className="min-w-0 text-[15px] text-ink">
                {k.titel}
                {!gleich && <span className="block text-xs font-semibold text-praxis-text">Unterschied: {Math.abs((s ?? 0) - (f ?? 0))} Punkte</span>}
              </span>
              <span className="w-12 text-center text-[17px] font-bold tabular-nums" aria-label={`Du: ${s ?? "–"} Punkte`}>
                {s ?? "–"}
              </span>
              <span className="w-16 text-center text-[17px] font-bold tabular-nums" aria-label={`Trainer:in: ${f ?? "–"} Punkte`}>
                {f ?? "–"}
              </span>
            </li>
          );
        })}
      </ul>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold text-ink">Was machst du nächstes Mal anders?</span>
        <textarea
          value={reflexion}
          onChange={(e) => setReflexion(e.target.value)}
          rows={3}
          placeholder="Ein, zwei Sätze für dich – bleibt nur in diesem Browser."
          className={cn("rounded-zeile border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-subtle", FOKUS)}
        />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Etappe geschafft!" zwischen zwei Phasen

export function EtappeGeschafft({
  titel,
  text,
  naechste,
  onWeiter,
}: {
  /** Je Phase eigener Titel, z. B. "Auftrag verstanden!" (praxisflow-daten.ts) */
  titel: string;
  text: string;
  naechste: string;
  onWeiter: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center gap-5 py-4 text-center text-ink animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none md:py-6"
    >
      <span className="relative flex size-20 items-center justify-center rounded-full bg-lime text-on-lime shadow-glow-charge animate-in zoom-in-50 duration-500 motion-reduce:animate-none">
        <Check className="size-10" strokeWidth={3} aria-hidden="true" />
        <Sparkles className="absolute -top-2 -right-3 size-6 text-brand" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[36px] leading-none md:text-[44px]">{titel}</h2>
        <p className={cn(TEXT, "text-ink-muted")}>{text}</p>
      </div>
      <button type="button" onClick={onWeiter} className={PRIMAER}>
        Weiter zu {naechste} <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Abschluss: Aufgabe geschafft + gestärkte Kompetenzen

export function AufgabeGeschafft({ kompetenzen }: { kompetenzen: { name: string; prozent: number }[] }) {
  return (
    <section className="flex flex-col items-center gap-6 py-4 text-center text-ink animate-in fade-in-0 zoom-in-95 duration-500 motion-reduce:animate-none md:py-6">
      <span className="flex size-20 items-center justify-center rounded-full bg-lime text-on-lime shadow-glow-charge">
        <PartyPopper className="size-10" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[40px] leading-none md:text-[52px]">Aufgabe geschafft!</h2>
        <p className={cn(TEXT, "text-ink-muted")}>Alle sechs Phasen sind abgeschlossen. Die Bestätigung durch die AfCJ läuft.</p>
      </div>
      {kompetenzen.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-semibold text-ink-muted">Das hast du gestärkt</span>
          <ul className="flex flex-wrap justify-center gap-6">
            {kompetenzen.map((k) => (
              <li key={k.name} className="flex w-32 flex-col items-center gap-2">
                <Ring prozent={k.prozent} glow groesse={80} />
                <span className="text-[13px] leading-snug font-semibold">{k.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link href="/kompetenzen" className={cn(PRIMAER, "w-auto")}>
        Zu deinen Kompetenzen <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
