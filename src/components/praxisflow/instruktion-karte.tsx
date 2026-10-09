import type { LucideIcon } from "lucide-react";

import { KARTE, TEXT } from "./stile";

/** Karte einer Phase: Kopf, Instruktion, optional Definition of Done, darunter der Inhalt. */
export function InstruktionKarte({
  icon: Icon,
  titel,
  instruktion,
  definitionOfDone,
  children,
}: {
  icon: LucideIcon;
  titel: string;
  instruktion: string;
  definitionOfDone?: string[];
  children?: React.ReactNode;
}) {
  return (
    <section className={KARTE} aria-labelledby="phase-titel">
      <div className="flex items-center gap-2">
        <Icon className="size-[18px] shrink-0 text-eco-deep-green" aria-hidden="true" />
        <h2 id="phase-titel" className="text-[15px] font-semibold text-eco-deep-green">
          {titel}
        </h2>
      </div>
      <p className={TEXT}>{instruktion}</p>
      {definitionOfDone && definitionOfDone.length > 0 && (
        <ListeBlock titel="Definition of Done" eintraege={definitionOfDone} />
      )}
      {children}
    </section>
  );
}

/** Überschrift mit einfacher Aufzählung. */
export function ListeBlock({ titel, eintraege }: { titel: string; eintraege: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-eco-deep-green">{titel}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-eco-deep-green">
        {eintraege.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

/** Material zum Lesen (nur Anzeige, keine Dateien). */
export function MaterialBlock({ eintraege }: { eintraege: { titel: string; beschreibung: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-eco-deep-green">Material zum Lesen</h3>
      <ul className="flex flex-col gap-2">
        {eintraege.map((m) => (
          <li key={m.titel} className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[15px] font-medium text-eco-deep-green">{m.titel}</p>
            <p className="text-sm text-muted-foreground">{m.beschreibung}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Zusatzinfos zum Aufklappen (natives details, ohne neue Abhängigkeit). */
export function Zusatzinfos({ eintraege }: { eintraege: { titel: string; text: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-eco-deep-green">Zusatzinfos</h3>
      {eintraege.map((z) => (
        <details key={z.titel} className="group rounded-lg border border-border px-3 py-2">
          <summary className="flex min-h-9 cursor-pointer items-center text-[15px] font-medium text-eco-deep-green">
            {z.titel}
          </summary>
          <p className="pt-1 pb-1 text-sm leading-relaxed text-eco-deep-green">{z.text}</p>
        </details>
      ))}
    </div>
  );
}

/** Hinweis mit Rand, z. B. zur Abnahme durch die Trainer:in. */
export function Hinweis({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-lylac/30 p-3 text-sm text-eco-deep-green">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
