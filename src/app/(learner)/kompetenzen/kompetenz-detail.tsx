import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, Check, ChevronRight, Clock, ThumbsDown, Video, Wrench } from "lucide-react";

import { Ring } from "@/components/fortschritts-ring";
import { aktivitaetMeta } from "@/lib/kompetenz-aktivitaet";
import type { CompetencyStepView, CompetencyView } from "@/lib/queries/competencies";
import type { Lernaktivitaet } from "@/lib/queries/kompetenzen-seite";
import { cn } from "@/lib/utils";

// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.4, SR
// folgt; Status und Zusatzinfo wie SR-62/63): Detailbereich rechts -- großer
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
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-eco-green text-white">
        <Check className="size-[13px]" strokeWidth={3.2} aria-hidden="true" />
      </span>
    ),
  },
  "in Prüfung": {
    text: "in Prüfung",
    symbol: (
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-info text-eco-deep-green">
        <Clock className="size-[13px]" strokeWidth={2.6} aria-hidden="true" />
      </span>
    ),
  },
  abgelehnt: {
    text: "abgelehnt",
    symbol: (
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-warning text-eco-deep-green">
        <ThumbsDown className="size-[13px]" strokeWidth={2.6} aria-hidden="true" />
      </span>
    ),
  },
  offen: {
    text: "",
    symbol: <span className="size-6 flex-none rounded-full border-2 border-border" />,
  },
};

/**
 * Offener Teilschritt, auf den heute eine Aktivität einzahlt (Brief 2.4):
 * Ring mit Charge-Green-Glow + "heute dran". Erreicht/in Prüfung/abgelehnt
 * behalten ihr eigenes Symbol.
 */
const HEUTE_DRAN = {
  text: "heute dran",
  symbol: <span className="size-6 flex-none rounded-full border-[3px] border-charge-green shadow-glow-charge-sm" />,
};

function TeilschrittZeile({ step, heute }: { step: CompetencyStepView; heute: boolean }) {
  const { text, symbol } = heute && step.status === "offen" ? HEUTE_DRAN : STATUS[step.status];
  const typ = step.typ === "praktisch" ? "Praxis" : "Theorie";
  return (
    <li className="flex items-center gap-3.5 border-b border-border py-2.5 last:border-b-0">
      <span aria-hidden="true">{symbol}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[15px]",
            step.status === "offen" && !heute ? "text-muted-foreground" : "text-eco-deep-green"
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
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {step.fortschritt.abgeschlossen} von {step.fortschritt.gesamt} {step.fortschritt.einheit}
          </span>
        )}
      </span>
      {text && (
        <span className="text-[13px] text-muted-foreground" aria-hidden="true">
          {text}
        </span>
      )}
    </li>
  );
}

// Aktivitätstypen wie auf Home (Brief Home 4): Icon + Farbe, nie nur Farbe.
// Kacheln als helle Fläche, Icon in der Typfarbe (Kontrast ≥ 3:1).
const TYP: Record<Lernaktivitaet["art"], { Icon: typeof Video; kachel: string }> = {
  live: { Icon: Video, kachel: "bg-info text-lylac" },
  selbst: { Icon: BookOpen, kachel: "bg-success text-eco-deep-green" },
  praxis: { Icon: Wrench, kachel: "bg-warning text-coral-text" },
};

/**
 * Brief 2.4 "Hier lernst du das": Lernaktivitäten, die auf die Teilschritte
 * einzahlen -- die USP Lernaktivität → Teilschritt → Kompetenz. Lektionen
 * öffnen die Lektionsseite, Praxis laut Entscheidung 2026-10-10 die
 * Demo-Seite /praxisflow-demo. Ohne Zuordnung: Bereich ausgeblendet.
 */
function HierLernstDu({ aktivitaeten, heute }: { aktivitaeten: Lernaktivitaet[]; heute: string }) {
  if (aktivitaeten.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[15px] font-bold">Hier lernst du das</h3>
      <ul className="flex flex-col gap-2.5">
        {aktivitaeten.map((a) => {
          const { Icon, kachel } = TYP[a.art];
          return (
            <li key={`${a.art}-${a.id}`}>
              <Link
                href={a.art === "praxis" ? "/praxisflow-demo" : `/content/${a.id}`}
                className="flex items-center gap-3.5 rounded-[14px] bg-off-white px-3.5 py-3 text-eco-deep-green outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none"
              >
                <span className={cn("flex size-9 flex-none items-center justify-center rounded-[10px]", kachel)}>
                  <Icon className="size-[17px]" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] leading-snug font-semibold">{a.titel}</span>
                  <span className="text-[13px] text-muted-foreground">{aktivitaetMeta(a, heute)}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function KompetenzDetail({
  kompetenz,
  aktivitaeten,
  heute,
  heuteStepIds,
}: {
  kompetenz: CompetencyView;
  aktivitaeten: Lernaktivitaet[];
  heute: string;
  /** Teilschritte, auf die heute eine Aktivität einzahlt */
  heuteStepIds: Set<string>;
}) {
  const heuteDran = kompetenz.steps.some((s) => heuteStepIds.has(s.id));
  // Lehrplan-Reihenfolge als Ersatz für ein eigenes Reihenfolge-Feld.
  const steps = [...kompetenz.steps].sort((a, b) => a.reihenfolge - b.reihenfolge);
  return (
    <section
      aria-labelledby="kompetenz-detail"
      className="flex min-w-0 flex-col gap-7 rounded-[20px] border border-border p-6 text-eco-deep-green md:p-8"
    >
      <div className="flex flex-wrap items-center gap-6">
        <Ring prozent={kompetenz.fortschrittProzent} glow={heuteDran} groesse={112} />
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
          {heuteDran && <span className="text-[13px] font-semibold">Heute dran</span>}
          <h2 id="kompetenz-detail" className="text-[22px] leading-tight font-bold md:text-[26px]">
            {kompetenz.name}
          </h2>
          {kompetenz.teilschritteGesamt > 0 && (
            <span className="text-[15px] text-muted-foreground">
              {kompetenz.teilschritteErfuellt} von {kompetenz.teilschritteGesamt} Teilschritten
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="mb-2 text-[15px] font-bold">Teilschritte</h3>
        {steps.length > 0 ? (
          <ul>
            {steps.map((s) => (
              <TeilschrittZeile key={s.id} step={s} heute={heuteStepIds.has(s.id)} />
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-muted-foreground">Für diese Kompetenz sind noch keine Teilschritte hinterlegt.</p>
        )}
      </div>

      <HierLernstDu aktivitaeten={aktivitaeten} heute={heute} />
    </section>
  );
}
