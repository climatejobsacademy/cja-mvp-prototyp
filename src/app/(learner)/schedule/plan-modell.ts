// Stundenplan v2 (SR-13, SR-73): wandelt die Wochendaten in das, was die
// Ansichten zeigen -- Blöcke im Zeitraster, ganztägige Praxistage, Chips in
// "Flexibel", Tagestyp. Reine Funktionen, keine Datenbank.

import type { EinstiegEintrag } from "@/lib/fachsprache-einstiege";
import { praxisaufgabeHref, praxistagHref } from "@/lib/schalter";
import type { Plantag } from "@/lib/queries/stundenplan";
import type { TrainerAnzeige } from "@/lib/queries/trainer";
import { praxistagFortschritt, praxistagTitel, type PraxistagFortschritt } from "@/lib/praxistag-kachel";
import { hatUhrzeit, naechsterTerminId, tagestypAus, type Tagestyp } from "@/lib/stundenplan";

/** "Grundlagen der Elektrotechnik: Der Transistor" bzw. nur der Titel ohne Thema. */
function volltitel(titel: string, thema: string | null): string {
  return thema ? `${titel}: ${thema}` : titel;
}

export type BlockStatus = "erledigt" | "vorbei" | "offen";

export type Block = {
  id: string;
  art: "live" | "praxis";
  /** Angezeigter Titel: bei Live der Kurstitel = Lektionsname ohne Thema-Klammer (lesson.name, Maltes Import 2026-10-16; course.name enthält das Thema in Klammern), Selbstlernen wie bisher Thema bzw. „Wissen festigen“ (Anna 2026-10-16) */
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
  /** Zweite begleitende Trainer:in (SR-78, 0071), nur Praxis */
  trainer2: TrainerAnzeige | null;
  /** Labortag (SR-94): Praxis-Farbe, eigener Name, führt zu den Unterlagen */
  labor: boolean;
  /** Praxistag (SR-13): ein Block je Tag mit Praxisaufträgen, Fortschritt je Auftrag */
  sammel: Sammel | null;
};

export type Sammel = PraxistagFortschritt;

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
  /** Schon begonnen ("in Bearbeitung"): dann "Weiterlernen", sonst kein Zusatz (Anna 2026-10-20) */
  begonnen: boolean;
};

/** Praxistag ohne Uhrzeit (field_job.start/ende leer): ganztägig, über dem Raster. */
export type Ganztag = {
  id: string;
  titel: string;
  ort: string | null;
  status: BlockStatus;
  /** Praxisaufgabe; null, wenn der Link ausgeschaltet ist (PRAXISAUFGABE_LINK) */
  href: string | null;
  fieldJobId: string;
  /** "Praxis mit …" (SR-78), null = niemand eingetragen */
  trainer: TrainerAnzeige | null;
  /** Zweite begleitende Trainer:in (SR-78, 0071) */
  trainer2: TrainerAnzeige | null;
  /** Labortag (SR-94) */
  labor: boolean;
  /** Praxistag (SR-13): Fortschritt je Auftrag */
  sammel: Sammel | null;
};


export type TagModell = {
  datum: string;
  heute: boolean;
  typ: Tagestyp | null;
  bloecke: Block[];
  ganztags: Ganztag[];
  chips: Chip[];
  /** Fachsprache-Einheiten zu den Live-Lektionen des Tages (veröffentlicht, Schalter an), sonst leer */
  fachsprache: EinstiegEintrag[];
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

export function planModell(
  tage: Plantag[],
  heute: string,
  jetzt: string,
  einstiege?: Map<string, EinstiegEintrag[]>
): TagModell[] {
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
          titel: e.titel,
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
          trainer2: null,
          labor: false,
          sammel: null,
        },
      ];
    });

    // Praxistag: mit Uhrzeit (0026) als Block im Raster, sonst ganztägig
    // ohne Uhrzeit -- keine Platzhalterzeit. Ziel ist der Praxistag-Ablauf.
    const praxisStatus = (status: string): BlockStatus =>
      status === "durchgeführt" ? "erledigt" : tag.datum < heute ? "vorbei" : "offen";

    // Jeder Tag mit Praxisaufträgen (SR-13): ein gleich aufgebauter Block
    // „Praxistag“ mit dem Zeitslot des Tages, der Zahl der Aufträge („1
    // Praxisauftrag“) und dem Fortschritt je Auftrag. Ein Auftrag: Klick direkt
    // hinein (Titel im Tooltip). Mehrere: Klick öffnet die Tagesübersicht.
    // Labortage (SR-94) bleiben eigene Einträge.
    const auftraege = tag.feld.filter((e) => !e.labor);
    const einzeln = tag.feld.filter((e) => e.labor);
    const sammelBloecke: Block[] = [];
    const sammelGanztags: Ganztag[] = [];
    if (auftraege.length > 0) {
      const fortschritt = praxistagFortschritt(auftraege);
      const einer = auftraege.length === 1 ? auftraege[0] : null;
      const mitZeit = auftraege.filter(hatUhrzeit);
      const mitTrainer = auftraege.find((e) => e.trainerId) ?? auftraege[0];
      const gemeinsam = {
        id: einer ? einer.scheduleEntryId : `praxistag-${tag.datum}`,
        titel: praxistagTitel(auftraege),
        ort: auftraege.find((e) => e.standort)?.standort ?? null,
        status: (fortschritt.fertig === fortschritt.anzahl ? "erledigt" : tag.datum < heute ? "vorbei" : "offen") as BlockStatus,
        href: einer ? praxisaufgabeHref(einer.fieldJobId, "stundenplan") : praxistagHref(tag.datum),
        trainer: trainerVon(mitTrainer.trainerId),
        trainer2: trainerVon(mitTrainer.zweitTrainerId),
        labor: false,
        sammel: fortschritt,
      };
      if (mitZeit.length > 0) {
        sammelBloecke.push({
          ...gemeinsam,
          art: "praxis",
          volltitel: `Praxistag: ${auftraege.map((e) => e.titel).join(", ")}`,
          datum: tag.datum,
          start: mitZeit.map((e) => e.start).sort()[0],
          ende: mitZeit.map((e) => e.ende).sort().at(-1)!,
          naechster: false,
          extern: false,
          liveRaum: null,
          inhalt: gemeinsam.href,
          lessonId: null,
          fieldJobId: einer ? einer.fieldJobId : null,
        });
      } else {
        sammelGanztags.push({ ...gemeinsam, fieldJobId: auftraege[0].fieldJobId });
      }
    }

    const praxis: Block[] = [...sammelBloecke, ...einzeln.flatMap((e) =>
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
              href: praxisaufgabeHref(e.fieldJobId, "stundenplan"),
              extern: false,
              liveRaum: null,
              inhalt: praxisaufgabeHref(e.fieldJobId, "stundenplan"),
              lessonId: null,
              fieldJobId: e.fieldJobId,
              trainer: trainerVon(e.trainerId),
              trainer2: trainerVon(e.zweitTrainerId),
              labor: e.labor,
              sammel: null,
            },
          ]
        : []
    )];
    const ganztags: Ganztag[] = [...sammelGanztags, ...einzeln
      .filter((e) => !hatUhrzeit(e))
      .map((e) => ({
        id: e.scheduleEntryId,
        titel: e.titel,
        ort: e.standort,
        status: praxisStatus(e.status),
        href: praxisaufgabeHref(e.fieldJobId, "stundenplan"),
        fieldJobId: e.fieldJobId,
        trainer: trainerVon(e.trainerId),
        trainer2: trainerVon(e.zweitTrainerId),
        labor: e.labor,
        sammel: null,
      }))];

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
          begonnen: e.unitProgressStatus === "in Bearbeitung",
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
      fachsprache: einstiege?.get(tag.datum) ?? [],
    };
  });

  // Brief 2.4: laufender bzw. nächster Termin von heute hervorheben (nur heute)
  // -- nach Datum und Uhrzeit, auch wenn er schon erledigt ist (Entscheidung
  // Anna 2026-10-11: ein vorab durchgeklickter Praxistag bleibt der nächste).
  const naechster = naechsterTerminId(
    modelle.flatMap((t) => t.bloecke),
    jetzt
  );
  for (const t of modelle) for (const b of t.bloecke) b.naechster = b.id === naechster;
  return modelle;
}
