import { Download, Eye, FileText, type LucideIcon } from "lucide-react";

import { DateiVorschau } from "@/components/datei-vorschau";
import { cn } from "@/lib/utils";

import { FOKUS, KARTE, TEXT } from "./stile";

/** Karte einer Phase: Kopf, Instruktion, Box "Hast du alles?" (wenn Kriterien da), darunter der Inhalt. */
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
  instruktion: string;
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
      <p className={TEXT}>{instruktion}</p>
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

/** Dateien zum Anzeigen (neuer Tab) oder Herunterladen; nur Dateien aus public/. */
export function DateienBlock({
  titel,
  ordner,
  dateien,
}: {
  titel: string;
  ordner: string;
  dateien: { titel: string; dateiname: string }[];
}) {
  const link = cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink hover:bg-subtle",
    FOKUS
  );
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-ink">{titel}</h3>
      <ul className="flex flex-col gap-2">
        {dateien.map((d) => {
          const href = `${ordner}/${encodeURIComponent(d.dateiname)}`;
          return (
            <li key={d.dateiname} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center">
              <span className="flex min-w-0 flex-1 items-center gap-2 text-[15px] text-ink">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 break-words">{d.titel}</span>
              </span>
              <span className="flex gap-1">
                {/* Anzeigen als Fenster über der Seite (Anna 2026-10-12). */}
                <DateiVorschau titel={d.titel} href={href} ausloeserLabel={`Anzeigen: ${d.titel}`} ausloeserKlasse={link}>
                  <Eye className="size-4" aria-hidden="true" />
                  Anzeigen
                </DateiVorschau>
                <a href={href} download={d.dateiname} className={link}>
                  <Download className="size-4" aria-hidden="true" />
                  Herunterladen
                </a>
              </span>
            </li>
          );
        })}
      </ul>
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
