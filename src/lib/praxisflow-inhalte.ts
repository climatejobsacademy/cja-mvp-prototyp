// Inhalte des Praxisflows (SR-64, SR-65, SR-88, SR-89): Phasen, Formate,
// Prüfliste, Bewertungsbogen und Texte. Übernommen aus dem Prototyp auf
// `demo`; Platzhalter sind gekennzeichnet, bis die Fachliche Leitung Praxis
// sie festlegt. Die ids der Prüfliste und des Bewertungsbogens müssen zu
// fn_praxis_pruefliste() (0060) und fn_praxis_bewertungsbogen() (0061)
// passen (Test praxisflow-inhalte.test.ts). Kein Codewort in diesem Code
// (SR-65): die Prüfung läuft nur auf dem Server.

import type { PraxisDateiArt, PraxisPhase } from "./database.types";

/** Sechs Phasen der vollständigen Handlung, ids wie field_job.phase. */
export const PHASEN: { id: Exclude<PraxisPhase, "abgeschlossen">; name: string }[] = [
  { id: "informieren", name: "Informieren" },
  { id: "planen", name: "Planen" },
  { id: "entscheiden", name: "Entscheiden" },
  { id: "ausfuehren", name: "Ausführen" },
  { id: "kontrollieren", name: "Kontrollieren" },
  { id: "bewerten", name: "Bewerten" },
];

const TABELLEN = ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** accept-Attribut je Art (Entscheidung 06.11.2026: Formate wie demo, 50 MB). */
export const UPLOAD_FORMATE: Record<PraxisDateiArt, string> = {
  auftrag: "image/*,application/pdf",
  hilfe: `image/*,application/pdf,${TABELLEN}`,
  plan: `image/*,application/pdf,.dwg,.dxf,.glb,${TABELLEN}`,
  protokoll: `application/pdf,image/*,${TABELLEN}`,
};

export const MAX_DATEI_BYTES = 52428800;

/** Erlaubte Typen wie Bucket praxis-dateien und field_job_datei (0059). */
const ERLAUBT = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf",
  "text/csv", "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/vnd.dwg", "image/vnd.dxf", "model/gltf-binary",
]);

const NACH_ENDUNG: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf", csv: "text/csv", xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  dwg: "image/vnd.dwg", dxf: "image/vnd.dxf", glb: "model/gltf-binary",
};

/**
 * Typ einer Datei für den Upload: CAD- und 3D-Formate nach der Endung, weil
 * Browser dafür oft keinen Typ liefern. null = nicht erlaubt.
 */
export function dateiTyp(name: string, browserTyp: string, art: PraxisDateiArt): string | null {
  const endung = name.toLowerCase().split(".").pop() ?? "";
  const typ = ERLAUBT.has(browserTyp) ? browserTyp : NACH_ENDUNG[endung];
  if (!typ || !ERLAUBT.has(typ)) return null;
  const cad = typ === "image/vnd.dwg" || typ === "image/vnd.dxf" || typ === "model/gltf-binary";
  if (cad && art !== "plan") return null;
  return typ;
}

/** Diktat in Planen: aus (Schreiben übt Fachdeutsch, viele Personen in einem Raum). */
export const DIKTAT_AN = false;

/** Punkteskala der Bewertung (keine Schulnoten). */
export const PUNKTE_SKALA = [10, 9, 7, 5, 3, 0] as const;

export type Pruefpunkt = { id: string; titel: string; text: string; punkte?: string[]; hinweis?: string };

export const PRUEFLISTE_STANDARD: { spannungsfrei: Pruefpunkt[]; unterSpannung: Pruefpunkt[] } = {
  spannungsfrei: [
    {
      id: "a1",
      titel: "Übungswand vom Netz getrennt",
      text: "Die Zuleitung ist nicht angeschlossen (Stecker gezogen) und gegen versehentliches Einstecken gesichert.",
      hinweis: "Später auf der Baustelle gelten an dieser Stelle die 5 Sicherheitsregeln, inklusive Spannungsfreiheit feststellen.",
    },
    {
      id: "a2",
      titel: "Besichtigung durchgeführt",
      text: "Prüfe die Anlage mit den Augen. Trage jeden Punkt im Prüfprotokoll mit i.O. oder n.i.O. ein:",
      punkte: [
        "Betriebsmittel richtig ausgewählt und unbeschädigt",
        "Leiterverbindungen fest",
        "N und PE richtig gekennzeichnet",
        "Stromkreise beschriftet",
        "Schutz gegen direktes Berühren vorhanden",
      ],
    },
    {
      id: "a3",
      titel: "Durchgängigkeit des Schutzleiters gemessen (R_PE)",
      text: "Von der PE-Schiene bis zu jedem Schutzkontakt und Körper.",
      punkte: [
        "Messstrom mindestens 200 mA",
        "Der Wert muss zur Leitungslänge und zum Querschnitt passen: Cu 1,5 mm² hat etwa 0,012 Ω je Meter",
        "Ein fester Grenzwert ist dafür nicht festgelegt",
      ],
    },
    {
      id: "a4",
      titel: "Isolationswiderstand gemessen (R_iso)",
      text: "Die Verbraucher sind abgeklemmt.",
      punkte: [
        "Messspannung 500 V DC",
        "Grenzwert mindestens 1 MΩ",
        "Messen zwischen allen aktiven Leitern und PE",
        "Messen zwischen den aktiven Leitern untereinander (L–N)",
      ],
    },
  ],
  unterSpannung: [
    {
      id: "c1",
      titel: "Schleifenimpedanz und RCD gemessen (Z_s, I_k, I_Δ, t_A)",
      text: "Erst messen, dann die Funktion erproben.",
      punkte: [
        "Schleifenimpedanz: Z_s × I_a ≤ U_0. Beispiel B16: I_a = 80 A, also Z_s ≤ 2,87 Ω",
        "RCD 30 mA: löst zwischen 15 und 30 mA aus",
        "Auslösezeit bei I_Δn höchstens 300 ms",
        "Berührungsspannung U_B höchstens 50 V",
      ],
    },
    {
      id: "c2",
      titel: "Funktion erprobt",
      text: "Die gesamte Messung ist bestanden. Jetzt prüfst du die Funktion:",
      punkte: [
        "Die Anlage schaltet wie geplant",
        "Der RCD löst über die Prüftaste aus",
        "Steckdosen sind richtig gepolt",
        "Drehstromsteckdosen haben ein Rechtsdrehfeld",
      ],
    },
  ],
};


export type BogenKriterium = { id: string; titel: string; skala: readonly number[]; ko?: boolean };

const GESTUFT = [10, 9, 7, 5, 3, 0] as const;
const JA_NEIN = [10, 0] as const;

export const BEWERTUNGSBOGEN_STANDARD: BogenKriterium[] = [
  { id: "funktion", titel: "Funktion: Die Anlage funktioniert wie vorgesehen", skala: JA_NEIN, ko: true },
  { id: "ausfuehrung", titel: "Fachgerechte Ausführung: Bauteile richtig montiert und angeschlossen", skala: GESTUFT },
  { id: "schutz", titel: "Schutzmaßnahmen sind erfüllt", skala: JA_NEIN, ko: true },
  { id: "protokoll", titel: "Prüfprotokoll: Messungen dokumentiert, Werte plausibel", skala: GESTUFT },
  { id: "unterlagen", titel: "Unterlagen vollständig: Pläne, Protokolle, Materialliste", skala: GESTUFT },
];

/** Texte der Stufen bei Ja/Nein-Kriterien. */
export const JA_NEIN_BESCHREIBUNGEN: Record<number, string> = {
  10: "Erfüllt.",
  0: "Nicht erfüllt.",
};

export const NOTEN_BESCHREIBUNGEN: Record<number, string> = {
  10: "Vollständig und fehlerfrei, ohne Hilfe. (Platzhalter)",
  9: "Fast vollständig, kleine Ungenauigkeiten. (Platzhalter)",
  7: "Überwiegend richtig, einzelne Fehler. (Platzhalter)",
  5: "Teilweise richtig, mehrere Fehler oder Hilfe nötig. (Platzhalter)",
  3: "Nur in Ansätzen erfüllt. (Platzhalter)",
  0: "Nicht erfüllt. (Platzhalter)",
};


export const TEXTE = {
  hastDuAllesTitel: "Hast du alles?",
  analyse: {
    auftragTitel: "Auftrag erhalten",
    auftragText:
      "Du hast den Arbeitsauftrag auf Papier bekommen und unterschrieben. Mach ein Foto davon oder lade den Scan hoch.",
    ausgabe: "Ausgegeben",
    frist: "Abgabe bis",
    auftragWeiter: "Auftrag angenommen",
    arbeitsauftrag:
      "Baue den Übungsaufbau auf dem Werkstattbrett nach der Vorlage auf. Arbeite sauber und so, dass eine zweite Person jeden Schritt nachvollziehen kann. (Platzhalter)",
  },
  planen: {
    unterschritt: (nr: number, gesamt: number) => `Schritt ${nr} von ${gesamt}`,
    gesperrt: "Trage mindestens einen Arbeitsschritt ein, dann geht es weiter zu Entscheiden.",
    plaeneTitel: "Pläne und Zeichnungen (wenn du welche hast)",
    plaeneText: "Hast du auf Papier gezeichnet oder mit einem Programm geplant? Lade Fotos oder Dateien hier hoch.",
  },
  // Eingabezeile in Planen (Tippen oder Diktat)
  eingabe: {
    hinzufuegen: "Hinzufügen",
    diktieren: "Diktieren",
    stoppen: "Stopp",
    hoertZu: "Hört zu …",
    verweigert: "Mikrofon nicht freigegeben. Du kannst die Einträge weiter tippen.",
    fehler: "Diktat gerade nicht möglich. Du kannst die Einträge weiter tippen.",
  },
  durchfuehren: {
    /** Hinweis an einem noch gesperrten Schritt; nr = Nummer des Vorgängers. */
    gesperrt: (nr: number) => `Zuerst Schritt ${nr} abschließen.`,
    // Wird gerade nicht angezeigt ("Ich komme nicht weiter" ist ausgeblendet,
    // im Prototyp), bleibt für die spätere Wiederverwendung.
    nichtWeiterStandard:
      "Halte kurz an und lies den Schritt noch einmal in deinem Plan nach. Hilft das nicht, frag die Trainer:in. (Platzhalter)",
  },
  kontrolle: {
    dokumentation: "Der Aufbau ist nach Vorlage fertig. Die Trainer:in geht mit dir das Prüfprotokoll durch. (Platzhalter)",
    hinweisProtokoll: "Das Prüfprotokoll wird auf Papier gemeinsam mit der Trainer:in durchgegangen.",
    spannungsfreiTitel: "Prüfen ohne Spannung",
    spannungsfreiText: "Diese Prüfungen machst du allein. Hake jede ab, wenn sie erledigt ist.",
    freigabeTitel: "Freigabe zur Inbetriebnahme",
    freigabeText:
      "Jetzt kommt Spannung auf die Anlage. Das darfst du nur, wenn deine Trainer:in dabei ist und die Anlage geprüft hat.",
    freigabeGesperrt: "Erst alle Prüfungen ohne Spannung abhaken.",
    unterSpannungTitel: "Prüfen unter Spannung",
    unterSpannungText: "Deine Trainer:in ist dabei. Hake jede Prüfung ab. Das Prüfprotokoll lädst du am Ende hoch.",
    protokollTitel: "Prüfprotokoll",
    protokollText:
      "Lade das Prüfprotokoll aus dem Prüfgerät (Installationsprüfer) als PDF hoch. Gibt es nur ein Papierprotokoll, mach ein Foto davon. Ausgefüllt sein müssen: Ergebnis „Mängel ja/nein“, Prüfer:in, Datum und Unterschrift.",
    ohneSpannungHinweis: "Bei diesem Auftrag kommt keine Spannung auf die Anlage. Eine Freigabe durch die Trainer:in ist nicht nötig.",
    weiter: "Weiter zu Bewerten",
  },
  reflexion: {
    titel: "Deine Erkenntnis",
    frage: "Was machst du beim nächsten Mal anders?",
    anfaenge: ["Gut lief …", "Nächstes Mal …"],
    platzhalter: "Gut lief … Nächstes Mal …",
    hinweis: "Ein, zwei Sätze reichen. Das steht danach in deiner Zusammenfassung.",
  },
  deuten: {
    startTitel: "Jetzt kontrollierst du deine Messwerte",
    startText: "Zu jedem Prüfpunkt schreibst du kurz, was dein Messwert bedeutet und welcher Grenzwert gilt. Dein Prüfprotokoll findest du links unter „Protokoll“.",
    frage: "Was bedeutet dein Messwert? Welcher Grenzwert gilt, und hältst du ihn ein?",
    platzhalter: "Zum Beispiel: 0,4 Ω gemessen, Grenzwert 1 Ω, also in Ordnung.",
    leer: "Schreib ein, zwei Sätze, dann geht es weiter.",
  },
  entscheiden: {
    bestaetigen: "Gib das Gerät deiner Trainer:in. Sie schaut sich deinen Plan an und gibt ihn mit dem Codewort frei.",
    button: "Ich fange an",
  },
  ausfuehren: {
    fertig: "Aufbau fertig – Kontrolle beginnen",
  },
  bewerten: {
    selbstTitel: "Deine Einschätzung",
    selbstText: "Prüfe dein Ergebnis und wähle je Kriterium die Punkte.",
    peerTitel: "Einschätzung durch einen Peer",
    peerText: "Gib das Gerät einer Person aus deiner Kohorte. Sie prüft dein Ergebnis und wählt je Kriterium die Punkte.",
    peerWeiter: "Weiter zur Trainer:in",
    fremdTitel: "Einschätzung durch die Trainer:in",
    fremdText: "Die Trainer:in prüft dein Ergebnis und wählt je Kriterium die Punkte.",
    ko: "K.-o.-Kriterium",
    nacharbeitTitel: "Noch einmal von vorn",
    nacharbeitText:
      "Bei einem K.-o.-Kriterium hat deine Trainer:in 0 Punkte gegeben. Dann zählt der Auftrag noch nicht für deine Kompetenzen. Schreib als Nächstes auf, was du beim nächsten Mal anders machst. Danach beginnt der Auftrag noch einmal bei Informieren. Dein Plan und deine Dateien bleiben, du kannst sie anpassen.",
    nacharbeitButton: "Neu beginnen",
    status: "Wird von der Academy for Climate Jobs bestätigt",
  },
  // Hinweis direkt am jeweiligen Codewort-Feld
  gates: {
    entscheiden: "Die Trainer:in nimmt deinen Plan ab und gibt ihn mit dem Codewort frei.",
    durchfuehren: "Wenn alle Schritte abgehakt sind, gibt die Trainer:in die Durchführung mit dem Codewort frei.",
    kontrolle: "Die Trainer:in prüft die Anlage und gibt die Inbetriebnahme mit dem Codewort frei.",
    bewerten: "Die Trainer:in bestätigt ihre Einschätzung mit dem Codewort. Ohne Codewort wird nichts gespeichert.",
  },
  codewort: {
    label: "Codewort der Trainer:in",
    falsch: "Das Codewort stimmt nicht.",
    gesperrtDurchfuehren: "Erst alle Schritte abhaken.",
    gesperrtBewerten: "Erst die Selbsteinschätzung für alle Kriterien ausfüllen.",
  },
};


/** Veränderung der Punkte gegenüber einem früheren Durchlauf (SR-90), z. B. "+10", "±0", "−2". */
export function punkteVeraenderung(vorher: number | undefined, jetzt: number | undefined): string | null {
  if (vorher === undefined || jetzt === undefined) return null;
  const d = jetzt - vorher;
  return d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "±0";
}
