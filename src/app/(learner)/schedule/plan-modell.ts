// Stundenplan v2 (SR-13, SR-73): wandelt die Wochendaten in das, was die
// Ansichten zeigen -- Blöcke im Zeitraster, ganztägige Praxistage, Chips in
// "Flexibel", Tagestyp. Reine Funktionen, keine Datenbank.

import type { Plantag } from "@/lib/queries/stundenplan";
import type { TrainerAnzeige } from "@/lib/queries/trainer";
import { hatUhrzeit, naechsterTerminId, tagestypAus, type Tagestyp } from "@/lib/stundenplan";

/** "Grundlagen der Elektrotechnik: Der Transistor" bzw. nur der Titel ohne Thema. */
function volltitel(titel: string, thema: string | null): string {
  return thema ? `${titel}: ${thema}` : titel;
}

export type BlockStatus = "erledigt" | "vorbei" | "offen";

export type Block = {
  id: string;
  art: "live" | "praxis";
  /** Angezeigter Titel: bei Live das Thema der Lektion (lesson.thema), sonst der Titel (Anna 2026-10-16, wie demo) */
  titel: string;
  /** Voller Titel für Bildschirmleser und Tooltip: "Lektion: Thema" */
  volltitel: string;
  datum: string;
  /** "HH:MM:SS" */
  start: string;
  ende: string;
  /** Praxis: Ort (field_job.standort), sonst null */
  ort: string | null;
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
  /** "Live mit …" / "Praxis mit …" (SR-78), null = niemand eingetragen */
  trainer: TrainerAnzeige | null;
};

export type Chip = {
  id: string;
  /** Angezeigter Titel: "Wissen festigen", wenn die Lektion zum Live-Unterricht des Tages gehört, sonst das Thema bzw. der Titel */
  titel: string;
  /** Voller Titel für Bildschirmleser und Tooltip: "Lektion: Thema" */
  volltitel: string;
  /** Gehört zum Live-Unterricht desselben Tages (lesson.live_lektion_id, 0029) */
  festigen: boolean;
  href: string;
  erledigt: boolean;
};

/** Praxistag ohne Uhrzeit (field_job.start/ende leer): ganztägig, über dem Raster. */
export type Ganztag = {
  id: string;
  titel: string;
  ort: string | null;
  status: BlockStatus;
  href: string;
  fieldJobId: string;
  /** "Praxis mit …" (SR-78), null = niemand eingetragen */
  trainer: TrainerAnzeige | null;
};


export type TagModell = {
  datum: string;
  heute: boolean;
  typ: Tagestyp | null;
  bloecke: Block[];
  ganztags: Ganztag[];
  chips: Chip[];
};

const hhmm = (zeit: string) => zeit.slice(0, 5);

/** "13:00:00" → "12:45:00" (am selben Tag; vor 00:15 bleibt 00:00) */
function minus15(zeit: string): string {
  const [h, m] = zeit.split(":").map(Number);
  const minuten = Math.max(0, h * 60 + m - 15);
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}:00`;
}

/** "09:00 – 12:00" */
export function zeitText(b: Pick<Block, "start" | "ende">): string {
  return `${hhmm(b.start)} – ${hhmm(b.ende)}`;
}

export function planModell(tage: Plantag[], heute: string, jetzt: string): TagModell[] {
  const modelle = tage.map((tag): TagModell => {
    const lektionHref = (lessonId: string) => `/content/${lessonId}?von=stundenplan&datum=${tag.datum}`;
    const trainerVon = (id: string | null) => (id ? (tag.trainer.get(id) ?? null) : null);

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
          titel: e.thema ?? e.titel,
          volltitel: volltitel(e.titel, e.thema),
          datum: tag.datum,
          start: s.start,
          ende: s.ende,
          ort: null,
          status: tag.anwesend.has(s.id) ? "erledigt" : vorbei ? "vorbei" : "offen",
          naechster: false,
          href: zumRaum ? s.joinLink : e.lessonId ? lektionHref(e.lessonId) : null,
          extern: zumRaum,
          liveRaum: zumRaum ? s.joinLink : null,
          inhalt: e.lessonId ? lektionHref(e.lessonId) : null,
          lessonId: e.lessonId,
          fieldJobId: null,
          trainer: trainerVon(s.trainerId),
        },
      ];
    });

    // Praxistag: mit Uhrzeit (0026) als Block im Raster, sonst ganztägig
    // ohne Uhrzeit -- keine Platzhalterzeit. Ziel ist der Praxistag-Ablauf.
    const praxisStatus = (status: string): BlockStatus =>
      status === "durchgeführt" ? "erledigt" : tag.datum < heute ? "vorbei" : "offen";
    const praxis: Block[] = tag.feld.flatMap((e) =>
      hatUhrzeit(e)
        ? [
            {
              id: e.scheduleEntryId,
              art: "praxis" as const,
              titel: e.titel,
              volltitel: e.titel,
              datum: tag.datum,
              start: e.start,
              ende: e.ende,
              ort: e.standort,
              status: praxisStatus(e.status),
              naechster: false,
              href: `/praxistag/${e.fieldJobId}`,
              extern: false,
              liveRaum: null,
              inhalt: `/praxistag/${e.fieldJobId}`,
              lessonId: null,
              fieldJobId: e.fieldJobId,
              trainer: trainerVon(e.trainerId),
            },
          ]
        : []
    );
    const ganztags: Ganztag[] = tag.feld
      .filter((e) => !hatUhrzeit(e))
      .map((e) => ({
        id: e.scheduleEntryId,
        titel: e.titel,
        ort: e.standort,
        status: praxisStatus(e.status),
        href: `/praxistag/${e.fieldJobId}`,
        fieldJobId: e.fieldJobId,
        trainer: trainerVon(e.trainerId),
      }));

    // Brief 2.4/5: Selbstlernen nur in "Flexibel", nie mit Uhrzeit.
    // Gehört die Selbstlern-Lektion zum Live-Unterricht desselben Tages, heißt
    // sie nur "Wissen festigen" (Anna 2026-10-11/16, wie demo); sonst das Thema.
    const liveLektionen = new Set(tag.theorie.filter((e) => e.art === "live" && e.lessonId).map((e) => e.lessonId));
    const chips: Chip[] = tag.theorie.flatMap((e) => {
      if (e.art !== "asynchron") return [];
      const festigen = !!e.liveLektionId && liveLektionen.has(e.liveLektionId);
      return [
        {
          id: e.scheduleEntryId,
          titel: festigen ? "Wissen festigen" : (e.thema ?? e.titel),
          volltitel: volltitel(e.titel, e.thema),
          festigen,
          href: e.lessonId ? lektionHref(e.lessonId) : "/content",
          erledigt: e.unitProgressStatus === "abgeschlossen",
        },
      ];
    });

    const bloecke = [...live, ...praxis].sort((a, b) => a.start.localeCompare(b.start));
    return {
      datum: tag.datum,
      heute: tag.datum === heute,
      typ: tagestypAus({ live: live.length, praxis: praxis.length + ganztags.length, flex: chips.length }),
      bloecke,
      ganztags,
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
