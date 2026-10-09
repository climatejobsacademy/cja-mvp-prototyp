import Link from "next/link";
import type { ReactNode } from "react";

import type { Tageszustand } from "@/lib/home-tag";
import type { NaechsterTermin } from "@/lib/queries/schedule";
import { cn } from "@/lib/utils";

import { naechsterTagText, naechsterTerminText } from "./home-hilfen";
import {
  ErledigtKarte,
  FlexKarte,
  FokusErledigt,
  FokusFlex,
  FokusLive,
  FokusPraxis,
  FokusRuhig,
  HeuteErledigtKarte,
  type GestaerkteKompetenz,
} from "./tages-karten";

// Home v6 (docs/design_handoff_home_v6, Brief 2.3 + 3, SR folgt): Bereich
// "Dein Tag" -- ordnet dem Tageszustand A-F die beiden Karten zu.

/** Namen der Kompetenzen, die eine Lektion bzw. ein Praxistag stärkt. */
export type StaerktFn = (art: "lektion" | "praxis", id: string | null) => string[];

function karten(
  zustand: Tageszustand,
  naechster: NaechsterTermin | null,
  staerkt: StaerktFn,
  gestaerkt: GestaerkteKompetenz[]
): { fokus: ReactNode; zweite: ReactNode } {
  switch (zustand.zustand) {
    case "A":
      return {
        fokus: <FokusLive live={zustand.live} laeuft={false} staerkt={staerkt("lektion", zustand.live.lessonId)} />,
        zweite: zustand.danach && <FlexKarte lektion={zustand.danach} />,
      };
    case "B":
      return {
        fokus: <FokusLive live={zustand.live} laeuft staerkt={staerkt("lektion", zustand.live.lessonId)} />,
        zweite: zustand.danach && <FlexKarte lektion={zustand.danach} gedimmt />,
      };
    case "C":
      return {
        fokus: <FokusFlex lektion={zustand.fokus} staerkt={staerkt("lektion", zustand.fokus.lessonId)} />,
        zweite: <ErledigtKarte erledigt={zustand.erledigt} />,
      };
    case "D":
      return {
        fokus: <FokusErledigt naechsterTag={naechster ? naechsterTagText(naechster) : null} gestaerkt={gestaerkt} />,
        zweite: <HeuteErledigtKarte erledigt={zustand.erledigt} />,
      };
    case "E":
      return {
        fokus: <FokusPraxis praxis={zustand.praxis} staerkt={staerkt("praxis", zustand.praxis.fieldJobId)} />,
        zweite: zustand.danach && <FlexKarte lektion={zustand.danach} />,
      };
    case "F":
      return { fokus: <FokusRuhig naechsterTermin={naechster ? naechsterTerminText(naechster) : null} />, zweite: null };
  }
}

export function DeinTag({
  zustand,
  naechster,
  staerkt,
  gestaerkt,
}: {
  zustand: Tageszustand;
  naechster: NaechsterTermin | null;
  staerkt: StaerktFn;
  gestaerkt: GestaerkteKompetenz[];
}) {
  const { fokus, zweite } = karten(zustand, naechster, staerkt, gestaerkt);
  return (
    <section aria-labelledby="dein-tag" className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="dein-tag" className="text-[15px] font-semibold text-muted-foreground">
          Dein Tag
        </h2>
        <Link
          href="/schedule"
          className="rounded-sm text-[15px] text-muted-foreground outline-none hover:text-eco-deep-green focus-visible:ring-2 focus-visible:ring-eco-green"
        >
          Woche ansehen →
        </Link>
      </div>
      {/* Brief 7: unter ca. 900 px untereinander, Fokus-Karte zuerst. */}
      <div className={cn("grid gap-4", zweite && "min-[900px]:grid-cols-[2fr_1fr]")}>
        {fokus}
        {zweite}
      </div>
    </section>
  );
}
