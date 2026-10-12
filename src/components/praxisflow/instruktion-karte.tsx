"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { FOKUS, KARTE, TEXT } from "./stile";

/** Karte einer Phase: Kopf, Instruktion (wenn gesetzt), Box "Hast du alles?" (wenn Kriterien da), darunter der Inhalt. */
export function InstruktionKarte({
  icon: Icon,
  titel,
  instruktion,
  hastDuAlles,
  hastDuAllesTitel,
  children,
}: {
  icon: LucideIcon;
  titel: string;
  instruktion?: string;
  hastDuAlles?: string[];
  hastDuAllesTitel: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={KARTE} aria-labelledby="phase-titel">
      <div className="flex items-center gap-2">
        <Icon className="size-[18px] shrink-0 text-ink" aria-hidden="true" />
        <h2 id="phase-titel" className="text-[15px] font-semibold text-ink">
          {titel}
        </h2>
      </div>
      {instruktion && <p className={TEXT}>{instruktion}</p>}
      {hastDuAlles && hastDuAlles.length > 0 && (
        <div className="rounded-lg border border-border bg-subtle p-3">
          <ListeBlock titel={hastDuAllesTitel} eintraege={hastDuAlles} />
        </div>
      )}
      {children}
    </section>
  );
}

/** Überschrift mit einfacher Aufzählung. */
export function ListeBlock({ titel, eintraege }: { titel: string; eintraege: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-ink">{titel}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-ink">
        {eintraege.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

type Datei = { titel: string; dateiname: string };

/**
 * Dateien der Analyse (nur Dateien aus public/). Ab Tablet-Breite (md): das
 * gewählte PDF eingebettet (ca. 70 % der Fensterhöhe), Umschalter zwischen
 * den Dateien, darunter "In neuem Tab öffnen" und "Herunterladen". Auf dem
 * Handy keine Einbettung, sondern je Datei eine große Karte, die das PDF im
 * nativen Viewer (neuer Tab) öffnet.
 */
export function DateienBlock({ titel, ordner, dateien }: { titel: string; ordner: string; dateien: Datei[] }) {
  const [gewaehlt, setGewaehlt] = useState(0);
  const href = (d: Datei) => `${ordner}/${encodeURIComponent(d.dateiname)}`;
  const aktiv = dateien[gewaehlt] ?? dateien[0];
  const link = cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink hover:bg-subtle",
    FOKUS
  );
  if (!aktiv) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-ink">{titel}</h3>

      {/* Handy: Karten, Antippen öffnet den nativen PDF-Viewer */}
      <ul className="flex flex-col gap-2 md:hidden">
        {dateien.map((d) => (
          <li key={d.dateiname}>
            <a
              href={href(d)}
              target="_blank"
              rel="noopener"
              aria-label={`${d.titel} (PDF, öffnet in neuem Tab)`}
              className={cn("flex min-h-16 items-center gap-3 rounded-lg border border-border bg-white p-3 hover:bg-subtle", FOKUS)}
            >
              <FileText className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-medium break-words text-ink">{d.titel}</span>
                <span className="text-xs text-muted-foreground">PDF · Antippen zum Öffnen</span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>

      {/* Ab Tablet: eingebettete Vorschau mit Umschalter */}
      <div className="hidden flex-col gap-3 md:flex">
        {dateien.length > 1 && (
          <div role="tablist" aria-label={titel} className="flex flex-wrap gap-2">
            {dateien.map((d, i) => (
              <button
                key={d.dateiname}
                type="button"
                role="tab"
                id={`datei-reiter-${i}`}
                aria-selected={i === gewaehlt}
                aria-controls="datei-vorschau"
                onClick={() => setGewaehlt(i)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm text-ink",
                  i === gewaehlt ? "border-brand bg-subtle font-semibold" : "border-border hover:bg-subtle",
                  FOKUS
                )}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {d.titel}
              </button>
            ))}
          </div>
        )}
        <div id="datei-vorschau" role={dateien.length > 1 ? "tabpanel" : undefined} aria-labelledby={dateien.length > 1 ? `datei-reiter-${gewaehlt}` : undefined}>
          <iframe
            key={aktiv.dateiname}
            src={`${href(aktiv)}#view=FitH`}
            title={`Vorschau: ${aktiv.titel}`}
            // Auf dem Handy ist der Block ausgeblendet; lazy lädt das PDF dort gar nicht.
            loading="lazy"
            className="h-[70vh] w-full rounded-lg border border-border bg-white"
          />
        </div>
        <span className="flex flex-wrap gap-1">
          <a href={href(aktiv)} target="_blank" rel="noopener" className={link}>
            <ExternalLink className="size-4" aria-hidden="true" />
            In neuem Tab öffnen
          </a>
          <a href={href(aktiv)} download={aktiv.dateiname} className={link}>
            <Download className="size-4" aria-hidden="true" />
            Herunterladen
          </a>
        </span>
      </div>
    </div>
  );
}

/** Hinweis mit Rand, z. B. zur Abnahme durch die Trainer:in. */
export function Hinweis({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-brand-tint p-3 text-sm text-ink">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
