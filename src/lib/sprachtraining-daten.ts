// Sprachtraining-Demo (nur Branch demo, Investoren-Demo; SR-31 Fachsprache
// des Tages, SR-24 Fachbegriffe in einfacher Sprache). Feste Beispielinhalte
// zur Lektion "Der Transistor / Die Dioden" -- keine Datenbank.
// VORLÄUFIG, nur Demo: Die Inhalte schrieb Claude (Anna 2026-10-12, ohne
// sichtbaren Platzhalter-Hinweis). Vor jedem echten Einsatz fachlich und
// sprachlich prüfen lassen (Trainer:in, Sprachtraining-Partner).

/** Selbst gezeichnete Abbildung (src/components/sprachtraining/wort-bilder.tsx) */
export type BildId = "diode" | "durchlass" | "sperr" | "kathode" | "transistor" | "anschluesse";

export type Wortkarte = {
  id: BildId;
  /** mit Artikel, z. B. "die Diode" */
  wort: string;
  erklaerung: string;
  beispiel: string;
};

export type QuizFrage = { id: string; frage: string; antworten: string[]; richtig: number; erklaerung: string; bild?: BildId };

export const FACHSPRACHE_DES_TAGES = {
  lektion: "Der Transistor / Die Dioden",
  dauer: "5 Min",
  wortkarten: [
    {
      id: "diode",
      wort: "die Diode",
      erklaerung: "Ein Bauteil, das Strom nur in eine Richtung durchlässt.",
      beispiel: "Die Diode lässt den Strom nur in eine Richtung fließen.",
    },
    {
      id: "durchlass",
      wort: "die Durchlassrichtung",
      erklaerung: "Die Richtung, in der die Diode den Strom fließen lässt.",
      beispiel: "In Durchlassrichtung leitet die Diode.",
    },
    {
      id: "sperr",
      wort: "die Sperrrichtung",
      erklaerung: "Die Richtung, in der die Diode keinen Strom durchlässt.",
      beispiel: "In Sperrrichtung sperrt die Diode.",
    },
    {
      id: "kathode",
      wort: "die Anode und die Kathode",
      erklaerung: "Die zwei Anschlüsse der Diode. Der Strom fließt von der Anode zur Kathode.",
      beispiel: "Der Ring auf der Diode zeigt die Kathode.",
    },
    {
      id: "transistor",
      wort: "der Transistor",
      erklaerung: "Ein Bauteil, das Strom schalten oder verstärken kann.",
      beispiel: "Ein kleiner Strom an der Basis schaltet den Transistor ein.",
    },
    {
      id: "anschluesse",
      wort: "die Basis, der Kollektor, der Emitter",
      erklaerung: "Die drei Anschlüsse eines Transistors.",
      beispiel: "Zeig mir bitte, wo der Kollektor ist.",
    },
  ] satisfies Wortkarte[],
  quiz: [
    {
      id: "q1",
      frage: "Was macht eine Diode?",
      antworten: ["Sie lässt Strom nur in eine Richtung durch.", "Sie speichert Strom.", "Sie misst die Spannung."],
      richtig: 0,
      erklaerung: "Eine Diode ist wie ein Ventil für Strom: Er fließt nur in eine Richtung.",
      bild: "durchlass",
    },
    {
      id: "q2",
      frage: "Der Ring auf der Diode zeigt …",
      antworten: ["die Anode.", "die Kathode.", "die Basis."],
      richtig: 1,
      erklaerung: "Der Ring markiert die Kathode – dorthin fließt der Strom.",
      bild: "diode",
    },
    {
      id: "q3",
      frage: "Welcher Anschluss gehört nicht zum Transistor?",
      antworten: ["die Basis", "der Emitter", "die Kathode"],
      richtig: 2,
      erklaerung: "Die Kathode gehört zur Diode. Der Transistor hat Basis, Kollektor und Emitter.",
      bild: "transistor",
    },
  ] satisfies QuizFrage[],
  saetze: [
    "Ich prüfe, ob die Diode richtig herum eingebaut ist.",
    "Die Diode ist in Sperrrichtung eingebaut, deshalb fließt kein Strom.",
    "Kannst du mir zeigen, wo der Kollektor ist?",
  ],
};

/**
 * Fachbegriffe zum Antippen (SR-24): Begriff (klein geschrieben, wie er im
 * Text vorkommt) → Erklärung in einfacher Sprache, optional Bild und Beispiel.
 */
export const FACHBEGRIFFE: Record<string, { begriff: string; erklaerung: string; bild?: BildId; beispiel?: string }> = {
  diode: {
    begriff: "die Diode",
    erklaerung: "Ein Bauteil, das Strom nur in eine Richtung durchlässt.",
    bild: "diode",
    beispiel: "Die Diode lässt den Strom nur in eine Richtung fließen.",
  },
  dioden: {
    begriff: "die Diode",
    erklaerung: "Ein Bauteil, das Strom nur in eine Richtung durchlässt.",
    bild: "diode",
    beispiel: "Die Diode lässt den Strom nur in eine Richtung fließen.",
  },
  transistor: {
    begriff: "der Transistor",
    erklaerung: "Ein Bauteil, das Strom schalten oder verstärken kann.",
    bild: "anschluesse",
    beispiel: "Ein kleiner Strom an der Basis schaltet den Transistor ein.",
  },
  sperrrichtung: { begriff: "die Sperrrichtung", erklaerung: "Die Richtung, in der die Diode keinen Strom durchlässt.", bild: "sperr" },
  durchlassrichtung: { begriff: "die Durchlassrichtung", erklaerung: "Die Richtung, in der die Diode den Strom fließen lässt.", bild: "durchlass" },
  kollektor: { begriff: "der Kollektor", erklaerung: "Einer der drei Anschlüsse des Transistors.", bild: "anschluesse" },
  baugruppen: { begriff: "die Baugruppe", erklaerung: "Mehrere Bauteile, die zusammen eine Aufgabe erfüllen." },
  verschaltungen: { begriff: "die Verschaltung", erklaerung: "Wie Bauteile miteinander verbunden sind." },
  löttechnik: { begriff: "die Löttechnik", erklaerung: "So verbindest du Bauteile mit geschmolzenem Lötzinn – fest und leitend." },
  platine: { begriff: "die Platine", erklaerung: "Eine Platte, auf der Bauteile sitzen und über Leiterbahnen verbunden sind." },
  jumper: { begriff: "der Jumper", erklaerung: "Eine kurze Drahtbrücke, die zwei Punkte verbindet." },
  multimeter: { begriff: "das Multimeter", erklaerung: "Ein Messgerät für Spannung, Strom und Widerstand." },
  übungsaufbau: { begriff: "der Übungsaufbau", erklaerung: "Eine Schaltung, die du zum Üben aufbaust." },
  werkstattbrett: { begriff: "das Werkstattbrett", erklaerung: "Eine Platte, auf der du Bauteile zum Üben befestigst." },
  vorlage: { begriff: "die Vorlage", erklaerung: "Die Zeichnung oder Anleitung, nach der du arbeitest." },
};
