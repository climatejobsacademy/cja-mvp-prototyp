// Programmseite v8 (docs/design_handoff_programm_v8, Brief 2.5, SR folgt):
// Inhalt des Seitenpanels "Inhalte des Moduls" -- Woche → Thema (= Kurs) →
// Lektion, mit Status je Lektion und welche Woche/welches Thema beim Öffnen
// aufgeklappt ist. Reine Logik ohne Datenbank und ohne Uhr; getestet in
// src/lib/programm-inhalte.test.ts.

import type { ModuleGroup } from "@/lib/queries/content";
import type { Plantag } from "@/lib/queries/stundenplan";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig (wie die Tests)
import { datumKurz, montagDerWoche } from "./date.ts";

export type LektionsStatus = "offen" | "erledigt" | "heute";
export type LektionsTyp = "live" | "selbstlern" | "dokument" | "praxis";

export type PanelLektion = {
  id: string;
  typ: LektionsTyp;
  label: string;
  /** "Heute, 13:00", "Fr, 09.10., 13:00" -- null ohne Termin */
  meta: string | null;
  status: LektionsStatus;
  /** null = kein Ziel (dann kein Link) */
  href: string | null;
  extern: boolean;
};

export type PanelThema = { id: string; titel: string; lektionen: PanelLektion[]; erledigt: number; offen: boolean };

export type PanelWoche = {
  id: string;
  titel: string;
  lektionen: number;
  erledigt: number;
  aktuell: boolean;
  offen: boolean;
  themen: PanelThema[];
};

/** Woche aus der Tabelle "module" mit ihrem Zeitraum im Stundenplan (getDbModule). */
type Woche = { id: string; von: string | null };

const LABEL: Record<string, string | null> = { live: "Live-Termin", scorm: "Selbstlernmodul", repository: null };

export function panelWochen(
  wochen: Woche[],
  gruppen: ModuleGroup[],
  plan: Plantag[],
  heute: string,
  jetzt: string,
  /** Seite des gewählten Moduls ist das aktuelle: Woche von heute aufklappen, sonst die erste */
  aktuellesModul: boolean
): PanelWoche[] {
  // Termine je Lektion bzw. Praxistag aus dem Stundenplan des Modulzeitraums.
  const termin = new Map<string, { datum: string; start: string | null; ende: string | null; joinLink: string | null; live: string | null }>();
  const anwesend = new Set<string>();
  const praxis = new Map<string, { datum: string; erledigt: boolean }>();
  for (const tag of plan) {
    for (const id of tag.anwesend) anwesend.add(id);
    for (const e of tag.theorie) {
      if (!e.lessonId || termin.has(e.lessonId)) continue;
      termin.set(e.lessonId, {
        datum: tag.datum,
        start: e.liveSession?.start ?? null,
        ende: e.liveSession?.ende ?? null,
        joinLink: e.liveSession?.joinLink ?? null,
        live: e.liveSession?.id ?? null,
      });
    }
    for (const f of tag.feld) praxis.set(f.fieldJobId, { datum: tag.datum, erledigt: f.status === "durchgeführt" });
  }

  const metaText = (datum: string, start: string | null) =>
    `${datum === heute ? "Heute" : datumKurz(datum)}${start ? `, ${start.slice(0, 5)}` : ""}`;

  const ergebnis = wochen.flatMap((w): PanelWoche[] => {
    const gruppe = gruppen.find((g) => g.id === w.id);
    if (!gruppe || !gruppe.name) return [];

    const themen: PanelThema[] = gruppe.courses.map((kurs) => {
      const lektionen = kurs.lessons.map((l): PanelLektion => {
        const t = termin.get(l.id);
        const typ: LektionsTyp = l.contentType === "live" ? "live" : l.contentType === "scorm" ? "selbstlern" : "dokument";
        // Entscheidung Anna 2026-10-11: Live erst mit bestätigter Anwesenheit
        // erledigt (wie im Stundenplan), sonst die abgeschlossene Lektion.
        const erledigt = typ === "live" ? !!t?.live && anwesend.has(t.live) : l.status === "abgeschlossen";
        const laeuftNoch = !!t && t.datum === heute && !!t.ende && `${t.datum}T${t.ende}` > jetzt;
        const zumRaum = typ === "live" && laeuftNoch && !!t?.joinLink;
        return {
          id: l.id,
          typ,
          label: LABEL[l.contentType] ?? l.name,
          meta: t ? metaText(t.datum, t.start) : null,
          status: erledigt ? "erledigt" : t?.datum === heute ? "heute" : "offen",
          href: zumRaum ? t!.joinLink : `/content/${l.id}`,
          extern: zumRaum,
        };
      });
      return { id: kurs.id, titel: kurs.name, lektionen, erledigt: lektionen.filter((l) => l.status === "erledigt").length, offen: false };
    });

    // Praxisaufgaben der Woche als eigenes Thema "Praxistag" (Brief-Referenz).
    if (gruppe.praxisTypen.length > 0) {
      const lektionen = gruppe.praxisTypen.map((p): PanelLektion => {
        const t = p.fieldJobId ? praxis.get(p.fieldJobId) : undefined;
        return {
          id: p.id,
          typ: "praxis",
          label: p.titel,
          meta: t ? metaText(t.datum, null) : null,
          status: t?.erledigt ? "erledigt" : t?.datum === heute ? "heute" : "offen",
          href: p.fieldJobId ? `/praxistag/${p.fieldJobId}?von=programm` : null,
          extern: false,
        };
      });
      themen.push({
        id: `praxis-${w.id}`,
        titel: "Praxistag",
        lektionen,
        erledigt: lektionen.filter((l) => l.status === "erledigt").length,
        offen: false,
      });
    }

    const alle = themen.flatMap((t) => t.lektionen);
    return [
      {
        id: w.id,
        titel: gruppe.name,
        lektionen: alle.length,
        erledigt: alle.filter((l) => l.status === "erledigt").length,
        aktuell: !!w.von && montagDerWoche(w.von) === montagDerWoche(heute),
        offen: false,
        themen,
      },
    ];
  });

  // Brief 2.5: beim Öffnen aktuelle Woche und aktuelles Thema aufgeklappt,
  // sonst (anderes Modul oder keine aktuelle Woche) die erste Woche.
  const offeneWoche = (aktuellesModul ? ergebnis.find((w) => w.aktuell) : undefined) ?? ergebnis[0];
  if (offeneWoche) {
    offeneWoche.offen = true;
    const thema =
      offeneWoche.themen.find((t) => t.lektionen.some((l) => l.status === "heute")) ??
      offeneWoche.themen.find((t) => t.lektionen.some((l) => l.status !== "erledigt")) ??
      offeneWoche.themen[0];
    if (thema) thema.offen = true;
  }
  return ergebnis;
}
