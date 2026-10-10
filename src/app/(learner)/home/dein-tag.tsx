import Link from "next/link";
import type { ReactNode } from "react";

import type { Tageszustand } from "@/lib/home-tag";
import type { NaechsterTermin } from "@/lib/queries/schedule";

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
} from "./tages-karten";

// Home v12/v13 (docs/design_handoff_home_v6, SR folgt): Bereich "Dein Tag" --
// ordnet dem Tageszustand A-F die Fokus-Karte und die Leiste darunter zu.

/** Kompetenzen (Id + Name), die eine Lektion bzw. ein Praxistag stärkt. */
export type StaerktFn = (art: "lektion" | "praxis", id: string | null) => StaerktKompetenz[];

function karten(
  zustand: Tageszustand,
  heute: string,
  naechster: NaechsterTermin | null,
  staerkt: StaerktFn,
  gestaerkt: GestaerkteKompetenz[]
): { fokus: ReactNode; leiste: ReactNode } {
  switch (zustand.zustand) {
    case "A":
      return {
        fokus: <FokusLive live={zustand.live} laeuft={false} staerkt={staerkt("lektion", zustand.live.lessonId)} />,
        leiste: zustand.danach && <FlexLeiste lektion={zustand.danach} />,
      };
    case "B":
      return {
        fokus: <FokusLive live={zustand.live} laeuft staerkt={staerkt("lektion", zustand.live.lessonId)} />,
        leiste: zustand.danach && <FlexLeiste lektion={zustand.danach} gedimmt />,
      };
    case "C": {
      const hatteLive = zustand.erledigt.some((e) => e.typ === "live");
      return {
        fokus: (
          <FokusFlex
            lektion={zustand.fokus}
            staerkt={staerkt("lektion", zustand.fokus.lessonId)}
            nurSelbstlernen={!hatteLive}
          />
        ),
        // Ohne Live-Unterricht heute keine "Erledigt"-Leiste, dafür die Zeile mit dem nächsten Tag.
        leiste: hatteLive && <ErledigtLeiste erledigt={zustand.erledigt} />,
      };
    }
    case "D":
      return {
        fokus: <FokusErledigt naechsterTag={naechster ? naechsterTagText(naechster) : null} gestaerkt={gestaerkt} />,
        leiste: <HeuteErledigtLeiste erledigt={zustand.erledigt} />,
      };
    case "E":
      return {
        fokus: <FokusPraxis praxis={zustand.praxis} staerkt={staerkt("praxis", zustand.praxis.fieldJobId)} />,
        leiste: zustand.danach ? (
          <FlexLeiste lektion={zustand.danach} />
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
}: {
  zustand: Tageszustand;
  heute: string;
  naechster: NaechsterTermin | null;
  staerkt: StaerktFn;
  gestaerkt: GestaerkteKompetenz[];
}) {
  const { fokus, leiste } = karten(zustand, heute, naechster, staerkt, gestaerkt);
  // Home v13: steht sonst nichts unter der Fokus-Karte, eine dezente Zeile mit
  // dem nächsten Tag. Nicht in D und F -- dort nennt die Karte ihn schon.
  const naechsterZeile =
    !leiste && naechster && zustand.zustand !== "D" && zustand.zustand !== "F"
      ? naechsterTagZeile(naechster, heute)
      : null;
  return (
    <section aria-labelledby="dein-tag" className="flex min-w-0 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="dein-tag" className="text-xl font-bold text-eco-deep-green">
          Dein Tag
        </h2>
        <Link
          href="/schedule"
          className="rounded-sm text-sm text-muted-foreground outline-none hover:text-eco-deep-green focus-visible:ring-2 focus-visible:ring-eco-green"
        >
          Woche ansehen →
        </Link>
      </div>
      {fokus}
      {leiste}
      {naechsterZeile && <NaechsterTagZeile {...naechsterZeile} />}
    </section>
  );
}
