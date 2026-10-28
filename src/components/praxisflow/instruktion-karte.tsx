"use client";

import { Check, FileText, type LucideIcon } from "lucide-react";

import { DateiVorschau } from "@/components/datei-vorschau";
import { cn } from "@/lib/utils";

import { FOKUS, KARTE, TEXT, UEBERSCHRIFT } from "./stile";

/**
 * Eine Phase (Angleichung an Home und Lektion, Anna 2026-10-12): oben die
 * Coral-Anker-Karte (helles Coral, dunkle Schrift) wie der Praxistag auf Home -- Phasen-Fortschritt, Symbol,
 * groß der Phasenname, ggf. die Instruktion --, darunter der Inhalt als
 * weiße Karte (mit "Hast du alles?", wenn Kriterien da sind).
 */
export function InstruktionKarte({
  icon: Icon,
  titel,
  instruktion,
  hastDuAlles,
  hastDuAllesTitel,
  fortschritt,
  children,
}: {
  icon: LucideIcon;
  titel: string;
  instruktion?: string;
  hastDuAlles?: string[];
  hastDuAllesTitel: string;
  /** Phasen-Fortschritt oben in der Anker-Karte */
  fortschritt?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby="phase-titel">
      <div className="flex flex-col gap-5 rounded-karte bg-anchor-praxis p-6 text-ink shadow-anchor-praxis md:px-7 md:py-7">
        {fortschritt}
        <div className="flex flex-col gap-2">
          <h2 id="phase-titel" className="flex items-center gap-3 font-heading text-[36px] leading-none md:text-[44px]">
            <Icon className="size-8 shrink-0" aria-hidden="true" />
            {titel}
          </h2>
          {instruktion && <p className="text-[15px] leading-relaxed">{instruktion}</p>}
        </div>
      </div>
      <div className={KARTE}>
        {hastDuAlles && hastDuAlles.length > 0 && (
          <div className="rounded-zeile bg-subtle p-4">
            <ListeBlock titel={hastDuAllesTitel} eintraege={hastDuAlles} />
          </div>
        )}
        {children}
      </div>
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

// Wie "Zum Nachlesen" in der Lektion (Anna 2026-10-12): Kacheln, Klick öffnet
// die Vorschau als Fenster über der Seite, "Herunterladen" steht im Fenster.
const KACHEL = cn(
  "flex h-full w-full flex-col items-start gap-3 rounded-zeile bg-subtle p-4 text-left text-ink transition-[background-color] duration-150 hover:bg-praxis-tint motion-reduce:transition-none",
  FOKUS
);

/**
 * Dateien der Analyse (nur Dateien aus public/) als Kacheln mit
 * Vorschau-Fenster. Mit `angesehen` bekommt eine geöffnete Datei ein Häkchen.
 */
export function DateienBlock({
  titel,
  ordner,
  dateien,
  angesehen,
  onOeffnen,
}: {
  titel: string;
  ordner: string;
  dateien: Datei[];
  angesehen?: Set<string>;
  onOeffnen?: (dateiname: string) => void;
}) {
  const href = (d: Datei) => `${ordner}/${encodeURIComponent(d.dateiname)}`;
  if (dateien.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {titel && <h3 className={UEBERSCHRIFT}>{titel}</h3>}
      {/* Gleichmäßige Reihen: drei Spalten nur, wenn die Zahl aufgeht. */}
      <ul className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", dateien.length % 3 === 0 && "lg:grid-cols-3")}>
        {dateien.map((d) => {
          const gesehen = !!angesehen?.has(d.dateiname);
          return (
            <li key={d.dateiname}>
              <DateiVorschau
                titel={d.titel}
                href={href(d)}
                ausloeserLabel={`Vorschau: ${d.titel}${gesehen ? ", angesehen" : ""}`}
                ausloeserKlasse={KACHEL}
                downloadHref={href(d)}
                downloadName={d.dateiname}
                onOeffnen={() => onOeffnen?.(d.dateiname)}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    gesehen ? "bg-brand text-white" : "bg-white text-praxis-text"
                  )}
                >
                  {gesehen ? (
                    <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <FileText className="size-5" aria-hidden="true" />
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] leading-snug font-semibold break-words">{d.titel}</span>
                  {angesehen && (
                    <span className="text-[13px] text-ink-muted">{gesehen ? "angesehen" : "Antippen zum Ansehen"}</span>
                  )}
                </span>
              </DateiVorschau>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Hinweis, z. B. zur Abnahme durch die Trainer:in. */
export function Hinweis({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-2.5 rounded-zeile bg-subtle p-4", TEXT, "text-sm")}>
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
