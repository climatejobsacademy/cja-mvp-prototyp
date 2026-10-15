import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, Check, ChevronDown, ChevronRight, Clock, ThumbsDown, Video, Wrench } from "lucide-react";

import { ModulZeichen } from "@/components/modul-zeichen";
import { Ring } from "@/components/fortschritts-ring";
import { TypIcon } from "@/components/typ-icon";
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

function TeilschrittZeile({ step, heute }: { step: CompetencyStepView; heute: boolean }) {
  const { text, symbol } = heute && step.status === "offen" ? HEUTE_DRAN : STATUS[step.status];
  const typ = step.typ === "praktisch" ? "Praxis" : "Theorie";
  return (
    <li className="flex items-center gap-3.5 border-b border-line py-2.5 last:border-b-0">
      {/* Rückmeldung Anna 2026-10-11: Typ-Symbol wie in der früheren Version --
          Buch = Theorie, Schraubenschlüssel = Praxis; Status rechts. */}
      <TypIcon typ={step.typ === "praktisch" ? "praxis" : "theorie"} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[15px]",
            step.status === "offen" && !heute ? "text-ink-muted" : "text-ink"
          )}
        >
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
 * Brief 2.4 "Hier lernst du das": Lernaktivitäten, die auf die Teilschritte
 * einzahlen -- die USP Lernaktivität → Teilschritt → Kompetenz. Lektionen
 * öffnen die Lektionsseite, Praxis den eigenen Praxistag dieses Typs
 * (/praxistag/[fieldJobId]); ohne eigenen Praxistag nur Text ohne Link.
 * Ohne Zuordnung: Bereich ausgeblendet. Wunsch Anna 2026-10-11: aufklappbar,
 * beim Öffnen einer Kompetenz zu. Groß das Thema (lesson.thema, sonst der
 * Titel), klein das Modul aus der Modul-Ebene (Anna 2026-10-12, 0028).
 */
/** Module mit Zeitraum im eigenen Stundenplan (fn_modul_zeitraum, 0028) -- für "Modul klein". */
export type ModulZeitraum = { ueberzeile: string; name: string; von: string | null; bis: string | null };

/** Modul, in dessen Zeitraum `datum` liegt; sonst null. */
function modulZu(module: ModulZeitraum[], datum: string | null): ModulZeitraum | null {
  if (!datum) return null;
  return module.find((m) => m.von && m.bis && m.von <= datum && datum <= m.bis) ?? null;
}

function HierLernstDu({
  aktivitaeten,
  heute,
  module,
}: {
  aktivitaeten: Lernaktivitaet[];
  heute: string;
  module: ModulZeitraum[];
}) {
  if (aktivitaeten.length === 0) return null;
  return (
    // Beim Öffnen des Panels zu (Anna 2026-10-12, wie schon 2026-10-11).
    <details className="group/lernen flex flex-col">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
        <h3 className="text-[15px] font-bold">Hier lernst du das</h3>
        <span className="text-[13px] text-ink-muted tabular-nums">· {aktivitaeten.length}</span>
        <ChevronDown
          className="ml-auto size-[18px] shrink-0 text-ink-muted transition-transform group-open/lernen:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <ul className="mt-2.5 flex flex-col gap-2.5">
        {aktivitaeten.map((a) => {
          return (
            <li key={`${a.art}-${a.id}`}>
              <AktivitaetZeile a={a} heute={heute} modul={modulZu(module, a.datum)} />
            </li>
          );
        })}
      </ul>
    </details>
  );
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
  const href = a.art === "praxis" ? (a.fieldJobId ? `/praxistag/${a.fieldJobId}` : null) : `/content/${a.id}`;
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
              <TeilschrittZeile key={s.id} step={s} heute={heuteStepIds.has(s.id)} />
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-muted">Für diese Kompetenz sind noch keine Kompetenzschritte hinterlegt.</p>
        )}
      </div>

      {/* key: beim Wechsel der Kompetenz wieder zugeklappt */}
      <HierLernstDu key={kompetenz.id} aktivitaeten={aktivitaeten} heute={heute} module={module} />
    </section>
  );
}
