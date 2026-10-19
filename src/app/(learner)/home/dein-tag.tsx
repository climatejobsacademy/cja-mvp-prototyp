import Link from "next/link";
import type { ReactNode } from "react";

import type { Tageszustand } from "@/lib/home-tag";
import type { NaechsterTermin } from "@/lib/queries/schedule";
import type { TrainerAnzeige } from "@/lib/queries/trainer";
import { cn } from "@/lib/utils";

import { naechsterTagText, naechsterTagZeile, naechsterTerminText, nochOffenText } from "./home-hilfen";
import {
  ErledigtLeiste,
  FlexLeiste,
  FokusErledigt,
  FokusFlex,
  FokusLive,
  FokusPraxis,
  FokusRuhig,
  HeuteErledigtLeiste,
  NaechsterTagZeile,
  type GestaerkteKompetenz,
  type StaerktKompetenz,
  type TitelStil,
} from "./tages-karten";

// Home v12/v13 (docs/design_handoff_home_v6; SR-73): Bereich "Dein Tag" --
// ordnet dem Tageszustand A-F die Fokus-Karte und die Leiste darunter zu.

/** Kompetenzen (Id + Name), die eine Lektion bzw. ein Praxistag stärkt. */
export type StaerktFn = (art: "lektion" | "praxis", id: string | null) => StaerktKompetenz[];

function karten(
  zustand: Tageszustand,
  heute: string,
  naechster: NaechsterTermin | null,
  staerkt: StaerktFn,
  gestaerkt: GestaerkteKompetenz[],
  trainer: Map<string, TrainerAnzeige>,
  stil: TitelStil,
  praxistag: boolean
): { fokus: ReactNode; leiste: ReactNode } {
  const person = (id: string | null) => (id ? (trainer.get(id) ?? null) : null);
  switch (zustand.zustand) {
    case "A":
      return {
        fokus: (
          <FokusLive
            live={zustand.live}
            laeuft={false}
            staerkt={staerkt("lektion", zustand.live.lessonId)}
            trainer={person(zustand.live.trainerId)}
            stil={stil}
            praxis={praxistag}
          />
        ),
        leiste: zustand.danach && <FlexLeiste lektion={zustand.danach} festigt={zustand.danach.festigt} />,
      };
    case "B":
      return {
        fokus: (
          <FokusLive
            live={zustand.live}
            laeuft
            staerkt={staerkt("lektion", zustand.live.lessonId)}
            trainer={person(zustand.live.trainerId)}
            stil={stil}
            praxis={praxistag}
          />
        ),
        leiste: zustand.danach && <FlexLeiste lektion={zustand.danach} festigt={zustand.danach.festigt} />,
      };
    case "C": {
      const hatteLive = zustand.erledigt.some((e) => e.typ === "live");
      return {
        fokus: (
          <FokusFlex
            lektion={zustand.fokus}
            staerkt={staerkt("lektion", zustand.fokus.lessonId)}
            nurSelbstlernen={!hatteLive}
            stil={stil}
            praxis={praxistag}
          />
        ),
        // Ohne Live-Unterricht heute keine "Erledigt"-Leiste, dafür die Zeile mit dem nächsten Tag.
        leiste: hatteLive && <ErledigtLeiste erledigt={zustand.erledigt} />,
      };
    }
    case "D":
      return {
        fokus: (
          <FokusErledigt
            naechsterTag={naechster ? naechsterTagText(naechster) : null}
            gestaerkt={gestaerkt}
            praxis={praxistag}
          />
        ),
        leiste: <HeuteErledigtLeiste erledigt={zustand.erledigt} />,
      };
    case "E":
      return {
        fokus: (
          <FokusPraxis
            praxis={zustand.praxis}
            staerkt={staerkt("praxis", zustand.praxis.fieldJobId)}
            trainer={person(zustand.praxis.trainerId)}
            stil={stil}
          />
        ),
        leiste: zustand.danach ? (
          <FlexLeiste lektion={zustand.danach} festigt={zustand.danach.festigt} />
        ) : (
          zustand.nachholen && (
            <FlexLeiste lektion={zustand.nachholen} kopf={nochOffenText(zustand.nachholen.datum, heute)} />
          )
        ),
      };
    case "F":
      return {
        fokus: <FokusRuhig naechsterTermin={naechster ? naechsterTerminText(naechster) : null} />,
        leiste: zustand.nachholen && (
          <FlexLeiste lektion={zustand.nachholen} kopf={nochOffenText(zustand.nachholen.datum, heute)} />
        ),
      };
  }
}

export function DeinTag({
  zustand,
  heute,
  naechster,
  staerkt,
  gestaerkt,
  trainer,
  stil,
  praxistag,
}: {
  zustand: Tageszustand;
  heute: string;
  naechster: NaechsterTermin | null;
  staerkt: StaerktFn;
  gestaerkt: GestaerkteKompetenz[];
  /** Trainer:innen im eigenen Plan (fn_meine_trainer, SR-78) */
  trainer: Map<string, TrainerAnzeige>;
  /** Modul für die kleine Zeile über dem Titel (Modul-Ebene, 0028) */
  stil: TitelStil;
  /** Heute ist ein Praxistag: Fokus-Karte immer in Coral (Anna 2026-10-19) */
  praxistag: boolean;
}) {
  const { fokus, leiste } = karten(zustand, heute, naechster, staerkt, gestaerkt, trainer, stil, praxistag);
  // Home v13: steht sonst nichts unter der Fokus-Karte, eine dezente Zeile mit
  // dem nächsten Tag. Nicht in D und F -- dort nennt die Karte ihn schon.
  const naechsterZeile =
    !leiste && naechster && zustand.zustand !== "D" && zustand.zustand !== "F"
      ? naechsterTagZeile(naechster, heute)
      : null;
  const rechts = !!(leiste || naechsterZeile);
  return (
    <section aria-labelledby="dein-tag" className="flex min-w-0 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="dein-tag" className="text-lg font-bold text-ink">
          Dein Tag
        </h2>
        <Link
          href="/schedule?ansicht=woche"
          className="rounded-sm text-sm font-semibold text-ink outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
        >
          Woche ansehen →
        </Link>
      </div>
      {/* Entscheidung Anna 2026-10-12: die Kästchen stehen rechts neben der
          Fokus-Karte statt darunter, gleich hoch wie die Karte. */}
      <div className={cn("grid gap-4", rechts && "min-[960px]:grid-cols-[2fr_1fr]")}>
        {fokus}
        {rechts && (
          // Ab 960 px bestimmt nur die Fokus-Karte die Höhe: die rechte
          // Spalte füllt genau diese Höhe, statt sie zu vergrößern.
          <div className="min-w-0 min-[960px]:relative">
            <div className="flex flex-col gap-4 min-[960px]:absolute min-[960px]:inset-0">
              {leiste}
              {naechsterZeile && <NaechsterTagZeile {...naechsterZeile} />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
