// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt): wandelt die
// Wochendaten in das, was die Ansichten zeigen -- Blöcke im Zeitraster,
// Chips in "Flexibel", Tagestyp. Reine Funktionen, keine Datenbank.

import type { Plantag } from "@/lib/queries/stundenplan";
import { gleicherTitel, naechsterTerminId, PRAXIS_STANDARDZEIT, tagestypAus, type Tagestyp } from "@/lib/stundenplan";

export type BlockStatus = "erledigt" | "vorbei" | "offen";

export type Block = {
  id: string;
  art: "live" | "praxis";
  titel: string;
  datum: string;
  /** "HH:MM:SS" */
  start: string;
  ende: string;
  /** Praxistag ohne echte Uhrzeit (PRAXIS_STANDARDZEIT) -- immer als "ca." zeigen */
  standardzeit: boolean;
  status: BlockStatus;
  naechster: boolean;
  /** Ziel beim Klick; null = kein Ziel (dann kein Link) */
  href: string | null;
  extern: boolean;
  /** Live: Link in den Live-Raum ab 15 Min. vor Beginn bis zum Ende (sonst null) */
  liveRaum: string | null;
  /** Lektionsseite (Unterlagen) bzw. Praxisaufgabe; null = keine */
  inhalt: string | null;
  lessonId: string | null;
  fieldJobId: string | null;
};

export type Chip = {
  id: string;
  titel: string;
  href: string;
  erledigt: boolean;
  /** Gleicher Titel wie ein Live-Termin desselben Tages → als "Wissen festigen" zeigen (Anna 2026-10-11) */
  refresher: boolean;
  /** Sprachtraining-Demo (SR-31, nur demo): "Fachsprache des Tages" */
  sprache?: boolean;
};


export type TagModell = {
  datum: string;
  heute: boolean;
  typ: Tagestyp | null;
  bloecke: Block[];
  chips: Chip[];
};

const hhmm = (zeit: string) => zeit.slice(0, 5);

/** "13:00:00" → "12:45:00" (am selben Tag; vor 00:15 bleibt 00:00) */
function minus15(zeit: string): string {
  const [h, m] = zeit.split(":").map(Number);
  const minuten = Math.max(0, h * 60 + m - 15);
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}:00`;
}

/** "09:00 – 12:00" bzw. "ca. 08:30 – 16:30" bei Standardzeit */
export function zeitText(b: Pick<Block, "start" | "ende" | "standardzeit">): string {
  return `${b.standardzeit ? "ca. " : ""}${hhmm(b.start)} – ${hhmm(b.ende)}`;
}

export function planModell(tage: Plantag[], heute: string, jetzt: string): TagModell[] {
  const modelle = tage.map((tag): TagModell => {
    const lektionHref = (lessonId: string) => `/content/${lessonId}?von=stundenplan&datum=${tag.datum}`;

    const live: Block[] = tag.theorie.flatMap((e) => {
      if (e.art !== "live" || !e.liveSession) return [];
      const s = e.liveSession;
      const vorbei = `${tag.datum}T${s.ende}` <= jetzt;
      // Wie Veras Stundenplan (Entscheidung Anna 2026-10-11): immer genau eine
      // Aktion -- ab 15 Min. vor Beginn bis zum Ende der Live-Raum, sonst die
      // Lektion. (Vera: erst ab Beginn; die 15 Min. zum rechtzeitigen Einwählen.)
      const zumRaum = !vorbei && !!s.joinLink && `${tag.datum}T${minus15(s.start)}` <= jetzt;
      return [
        {
          id: e.scheduleEntryId,
          art: "live",
          titel: e.titel,
          datum: tag.datum,
          start: s.start,
          ende: s.ende,
          standardzeit: false,
          status: tag.anwesend.has(s.id) ? "erledigt" : vorbei ? "vorbei" : "offen",
          naechster: false,
          href: zumRaum ? s.joinLink : e.lessonId ? lektionHref(e.lessonId) : null,
          extern: zumRaum,
          liveRaum: zumRaum ? s.joinLink : null,
          inhalt: e.lessonId ? lektionHref(e.lessonId) : null,
          lessonId: e.lessonId,
          fieldJobId: null,
        },
      ];
    });

    const praxis: Block[] = tag.feld.map((e) => ({
      id: e.scheduleEntryId,
      art: "praxis",
      titel: e.titel,
      datum: tag.datum,
      start: PRAXIS_STANDARDZEIT.start,
      ende: PRAXIS_STANDARDZEIT.ende,
      standardzeit: true,
      status: e.status === "durchgeführt" ? "erledigt" : tag.datum < heute ? "vorbei" : "offen",
      naechster: false,
      // Wie Home und Kompetenzen (Entscheidung 2026-10-09): Demo-Praxisflow.
      href: "/praxisflow-demo",
      extern: false,
      liveRaum: null,
      inhalt: "/praxisflow-demo",
      lessonId: null,
      fieldJobId: e.fieldJobId,
    }));

    // Brief 2.4/5: Selbstlernen nur in "Flexibel", nie mit Uhrzeit.
    const chips: Chip[] = tag.theorie.flatMap((e) => {
      if (e.art !== "asynchron") return [];
      return [
        {
          id: e.scheduleEntryId,
          titel: e.titel,
          href: e.lessonId ? lektionHref(e.lessonId) : "/content",
          erledigt: e.unitProgressStatus === "abgeschlossen",
          refresher: live.some((l) => gleicherTitel(l.titel, e.titel)),
        },
      ];
    });

    const bloecke = [...live, ...praxis].sort((a, b) => a.start.localeCompare(b.start));
    return {
      datum: tag.datum,
      heute: tag.datum === heute,
      typ: tagestypAus({ live: live.length, praxis: praxis.length, flex: chips.length }),
      bloecke,
      chips,
    };
  });

  // Brief 2.4: nächster bzw. laufender Termin der angezeigten Woche hervorheben
  // -- nach Datum und Uhrzeit, auch wenn er schon erledigt ist (Entscheidung
  // Anna 2026-10-11: ein vorab durchgeklickter Praxistag bleibt der nächste).
  const naechster = naechsterTerminId(
    modelle.flatMap((t) => t.bloecke),
    jetzt
  );
  for (const t of modelle) for (const b of t.bloecke) b.naechster = b.id === naechster;
  return modelle;
}
