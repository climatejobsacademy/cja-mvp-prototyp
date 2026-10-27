import Link from "next/link";
import type { ReactNode } from "react";
import { praxisaufgabeHref } from "@/lib/schalter";
import { BookOpen, Check, ChevronDown, ChevronRight, Clock, ThumbsDown, Video, Wrench } from "lucide-react";

import { ModulZeichen } from "@/components/modul-zeichen";
import { Ring } from "@/components/fortschritts-ring";
import { AKTIVITAET_ART, aktivitaetMeta } from "@/lib/kompetenz-aktivitaet";
import type { CompetencyStepView, CompetencyView } from "@/lib/queries/competencies";
import type { Lernaktivitaet } from "@/lib/queries/kompetenzen-seite";
import { cn } from "@/lib/utils";

// Kompetenzseite v1 (Brief 2.4; Status und Zusatzinfo wie SR-62/63):
// Detailbereich rechts -- großer
// Ring, Name, Zähler und die Teilschritte mit ihrem Status.

/**
 * Statussymbol je Teilschritt. Die Datenbank kennt vier Stände; "in Prüfung"
 * und "abgelehnt" (nur Praxis) zusätzlich zum Brief, Entscheidung Anna
 * 2026-10-10. Nie nur über Farbe: immer Symbol + Text (bei "offen" das leere
 * Symbol + sr-only).
 */
const STATUS: Record<
  CompetencyStepView["status"],
  { text: string; symbol: ReactNode }
> = {
  abgeschlossen: {
    text: "erreicht",
    symbol: (
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-progress text-white">
        <Check className="size-[13px]" strokeWidth={3.2} aria-hidden="true" />
      </span>
    ),
  },
  "in Prüfung": {
    text: "in Prüfung",
    symbol: (
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-brand-tint text-brand">
        <Clock className="size-[13px]" strokeWidth={2.6} aria-hidden="true" />
      </span>
    ),
  },
  abgelehnt: {
    text: "abgelehnt",
    symbol: (
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-praxis-tint text-praxis-text">
        <ThumbsDown className="size-[13px]" strokeWidth={2.6} aria-hidden="true" />
      </span>
    ),
  },
  offen: {
    text: "",
    symbol: <span className="size-6 flex-none rounded-full border-2 border-progress-track" />,
  },
};

/**
 * Offener Teilschritt, auf den heute eine Aktivität einzahlt (Brief 2.4):
 * Ring mit Charge-Green-Glow + "heute dran". Erreicht/in Prüfung/abgelehnt
 * behalten ihr eigenes Symbol.
 */
const HEUTE_DRAN = {
  text: "heute dran",
  symbol: <span className="size-6 flex-none rounded-full border-[3px] border-lime shadow-glow-charge-sm" />,
};

/**
 * Kompetenzschritt (Anna 2026-10-27): nur Beschreibung und Status, ohne
 * Typ-Symbol -- das grüne Buch las sich wie „Selbstlernen“, obwohl ein
 * theoretischer Schritt auch über den Live-Unterricht erreicht wird. Gibt es
 * Lernaktivitäten dazu, klappt der Schritt auf und zeigt sie als Links
 * (Live, Selbstlernen, Praxis).
 */
function TeilschrittZeile({
  step,
  heute,
  aktivitaeten,
  heuteDatum,
  module,
}: {
  step: CompetencyStepView;
  heute: boolean;
  aktivitaeten: Lernaktivitaet[];
  heuteDatum: string;
  module: ModulZeitraum[];
}) {
  const { text, symbol } = heute && step.status === "offen" ? HEUTE_DRAN : STATUS[step.status];
  const typ = step.typ === "praktisch" ? "Praxis" : "Theorie";
  const kopf = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[15px]", step.status === "offen" && !heute ? "text-ink-muted" : "text-ink")}>
          {step.name}
          <span className="sr-only">
            {" "}
            · {typ} · {text || "offen"}
          </span>
        </span>
        {/* SR-62: Zusatzinfo nur bei offen / in Prüfung. */}
        {step.fortschritt && (step.status === "offen" || step.status === "in Prüfung") && (
          <span className="text-[13px] text-ink-muted tabular-nums">
            {step.fortschritt.abgeschlossen} von {step.fortschritt.gesamt} {step.fortschritt.einheit}
          </span>
        )}
      </span>
      {text && (
        <span className="text-[13px] text-ink-muted" aria-hidden="true">
          {text}
        </span>
      )}
      <span aria-hidden="true">{symbol}</span>
    </>
  );
  if (aktivitaeten.length === 0) {
    return <li className="flex items-center gap-3.5 border-b border-line py-2.5 last:border-b-0">{kopf}</li>;
  }
  return (
    <li className="border-b border-line last:border-b-0">
      <details className="group/schritt">
        <summary className="flex cursor-pointer list-none items-center gap-3.5 rounded-lg py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
          {kopf}
          <ChevronDown
            className="size-[18px] shrink-0 text-ink-muted transition-transform group-open/schritt:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>
        {/* Dezente Überschrift, damit klar ist, was die Links sind (Anna 2026-10-27). */}
        <p className="pb-2 text-[13px] font-semibold text-ink">Hier lernst du das</p>
        <ul className="flex flex-col gap-2 pb-3">
          {aktivitaeten.map((a) => (
            <li key={`${a.art}-${a.id}`}>
              <AktivitaetZeile a={a} heute={heuteDatum} modul={modulZu(module, a.datum)} />
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

// Aktivitätstypen wie auf Home (Brief Home 4): Icon + Farbe, nie nur Farbe.
// Kacheln als helle Fläche, Icon in der Typfarbe (Kontrast ≥ 3:1).
const TYP: Record<Lernaktivitaet["art"], { Icon: typeof Video; kachel: string }> = {
  live: { Icon: Video, kachel: "bg-brand-tint text-brand" },
  selbst: { Icon: BookOpen, kachel: "bg-self-tint text-self" },
  praxis: { Icon: Wrench, kachel: "bg-praxis-tint text-praxis-text" },
};

/**
 * Lernaktivitäten je Kompetenzschritt (Brief 2.4, seit Anna 2026-10-27 im
 * aufgeklappten Schritt statt in „Hier lernst du das“): Lektionen öffnen die
 * Lektionsseite, Praxis den eigenen Praxistag dieses Typs; ohne eigenen
 * Praxistag nur Text ohne Link. Groß das Thema, klein das Modul (0028).
 */
/** Module mit Zeitraum im eigenen Stundenplan (fn_modul_zeitraum, 0028) -- für "Modul klein". */
export type ModulZeitraum = { ueberzeile: string; name: string; von: string | null; bis: string | null };

/** Modul, in dessen Zeitraum `datum` liegt; sonst null. */
function modulZu(module: ModulZeitraum[], datum: string | null): ModulZeitraum | null {
  if (!datum) return null;
  return module.find((m) => m.von && m.bis && m.von <= datum && datum <= m.bis) ?? null;
}

/** Eine Lernaktivität: Link, wenn es ein Ziel gibt, sonst dieselbe Zeile ohne Link. */
function AktivitaetZeile({
  a,
  heute,
  modul,
}: {
  a: Lernaktivitaet;
  heute: string;
  modul: { ueberzeile: string; name: string } | null;
}) {
  const { Icon, kachel } = TYP[a.art];
  const href = a.art === "praxis" ? (a.fieldJobId ? praxisaufgabeHref(a.fieldJobId) : null) : `/content/${a.id}`;
  const wann = aktivitaetMeta(a, heute);
  const inhalt = (
    <>
      <span className={cn("flex size-9 flex-none items-center justify-center rounded-[10px]", kachel)}>
        <Icon className="size-[17px]" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] leading-snug font-semibold">{a.thema ?? a.titel}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted">
          <span className="sr-only">{AKTIVITAET_ART[a.art]}: </span>
          {modul && <ModulZeichen klein ueberzeile={modul.ueberzeile} name={modul.name} />}
          {modul && wann && <span aria-hidden="true">·</span>}
          {wann && <span>{wann}</span>}
        </span>
      </span>
    </>
  );
  const zeile = "flex items-center gap-3.5 rounded-zeile bg-subtle px-3.5 py-3 text-ink";
  if (!href) return <div className={zeile}>{inhalt}</div>;
  return (
    <Link
      href={href}
      className={cn(
        zeile,
        "outline-none transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
      )}
    >
      {inhalt}
      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  );
}

export function KompetenzDetail({
  kompetenz,
  aktivitaeten,
  heute,
  heuteStepIds,
  module = [],
}: {
  kompetenz: CompetencyView;
  aktivitaeten: Lernaktivitaet[];
  heute: string;
  /** Teilschritte, auf die heute eine Aktivität einzahlt */
  heuteStepIds: Set<string>;
  /** Module mit Zeitraum, für die Modul-Zeile je Aktivität */
  module?: ModulZeitraum[];
}) {
  const heuteDran = kompetenz.steps.some((s) => heuteStepIds.has(s.id));
  // Reihenfolge je Kompetenz aus competency_competency_step.reihenfolge (0027).
  const steps = [...kompetenz.steps].sort((a, b) => a.reihenfolge - b.reihenfolge);
  return (
    <section
      aria-labelledby="kompetenz-detail"
      className="flex min-w-0 flex-col gap-7 rounded-karte bg-card p-6 text-ink shadow-card md:p-8"
    >
      <div className="flex flex-wrap items-center gap-6">
        <Ring prozent={kompetenz.fortschrittProzent} glow={heuteDran} groesse={112} />
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
          <h2 id="kompetenz-detail" className="text-[22px] leading-tight font-bold md:text-[26px]">
            {kompetenz.name}
          </h2>
          {kompetenz.teilschritteGesamt > 0 && (
            <span className="text-[15px] text-ink-muted">
              {kompetenz.teilschritteErfuellt} von {kompetenz.teilschritteGesamt} Kompetenzschritten
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="mb-2 text-[15px] font-bold">Kompetenzschritte</h3>
        {steps.length > 0 ? (
          <ul>
            {steps.map((s) => (
              <TeilschrittZeile
                key={`${kompetenz.id}-${s.id}`}
                step={s}
                heute={heuteStepIds.has(s.id)}
                aktivitaeten={aktivitaeten.filter((a) => a.stepIds.includes(s.id))}
                heuteDatum={heute}
                module={module}
              />
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-muted">Für diese Kompetenz sind noch keine Kompetenzschritte hinterlegt.</p>
        )}
      </div>

    </section>
  );
}
