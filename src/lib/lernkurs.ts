// Eigenes Kursformat der Plattform für Selbstlern-Lektionen (SR-85).
//
// Die native Selbstlern-Ansicht (src/app/(learner)/content/[lessonId]/
// native-lektion.tsx) kennt nur dieses Format, kein Format eines
// Autorenwerkzeugs. Quellen liefern einen `Lernkurs` über einen Adapter;
// heute gibt es genau einen: Elephant-SCORM-Pakete (src/lib/elephant-kurs.ts,
// `elephantZuLernkurs`). Später können direkt erstellte Kurse (z. B. von
// Claude nach Vorlagen) in dieses Format geschrieben werden; wo sie dann
// gespeichert werden, ist eine spätere Entscheidung (Migration nötig).
//
// Aufbau: Kurs -> Kapitel -> Schritte -> Bausteine. Ein Schritt ist eine
// Bildschirmseite ("Weiter" geht zum nächsten Schritt) und enthält
// höchstens eine Frage. Medien stehen als Schlüssel im Kurs; was ein
// Schlüssel bedeutet (beim Elephant-Paket: Pfad im Zip), weiß nur die
// Quelle. Die Oberfläche fragt sie über die Medien-Route der Lektion an.
// Text ist ein sicherer Knotenbaum (nur Text und wenige Tags, keine
// Attribute) -- nie rohes HTML.

export type TextTag = "h1" | "h2" | "h3" | "p" | "strong" | "em" | "u" | "ul" | "ol" | "li" | "br";
export type TextKnoten = string | { tag: TextTag; kinder: TextKnoten[] };

/** Schlüssel eines Mediums (Bild, Audio, Video) innerhalb der Quelle. */
export type MedienSchluessel = string;

export type Antwort = {
  text: string;
  /** Bild als Antwort (Bildauswahl); dann ist `text` die Beschriftung für Screenreader. */
  bild: MedienSchluessel | null;
  /** Symbol neben dem Text (z. B. bei "Stimmt"/"Stimmt nicht"). */
  symbol: "daumen-hoch" | "daumen-runter" | null;
  richtig: boolean;
};

export type Baustein =
  /** Große Überschrift einer Titelkarte. */
  | { art: "ueberschrift"; text: string }
  | { art: "text"; inhalt: TextKnoten[] }
  | { art: "bild"; quelle: MedienSchluessel; beschreibung: string }
  /** Eingesprochener Text zum Schritt (Knopf "Vorlesen"). */
  | { art: "audio"; quelle: MedienSchluessel }
  | { art: "video"; quelle: MedienSchluessel; vorschau: MedienSchluessel | null }
  | {
      art: "frage";
      frage: string;
      /** Kleine Zeile über der Frage, z. B. "Stimmt das?". */
      hinweis: string | null;
      darstellung: "liste" | "paar" | "bilder";
      /** Antworten in fester, aber gemischter Reihenfolge zeigen. */
      mischen: boolean;
      antworten: Antwort[];
      /** Erklärung nach der richtigen Antwort. */
      rueckmeldung: TextKnoten[];
    }
  | {
      art: "hotspot";
      titel: string | null;
      bild: MedienSchluessel;
      /** x, y zwischen 0 und 1, bezogen auf das Bild. */
      punkte: { x: number; y: number; inhalt: TextKnoten[] }[];
    };

export type Schritt = { id: string; bausteine: Baustein[] };
export type Kapitel = { id: string; titel: string; schritte: Schritt[] };
export type Lernkurs = { titel: string; beschreibung: string; kapitel: Kapitel[] };

/** Die (einzige) Frage eines Schritts oder null. */
export function schrittFrage(s: Schritt): Extract<Baustein, { art: "frage" }> | null {
  for (const b of s.bausteine) if (b.art === "frage") return b;
  return null;
}

/** Bilder eines Schritts (zum Vorladen). */
export function schrittBilder(s: Schritt): MedienSchluessel[] {
  return s.bausteine.flatMap((b) => {
    if (b.art === "bild") return [b.quelle];
    if (b.art === "hotspot") return [b.bild];
    if (b.art === "video") return b.vorschau ? [b.vorschau] : [];
    if (b.art === "frage") return b.antworten.flatMap((a) => (a.bild ? [a.bild] : []));
    return [];
  });
}

/** Alle Medien, die der Kurs nutzt (nur diese liefert die Medien-Route aus). */
export function kursMedien(kurs: Lernkurs): Set<MedienSchluessel> {
  const s = new Set<MedienSchluessel>();
  for (const kap of kurs.kapitel)
    for (const schritt of kap.schritte) {
      for (const p of schrittBilder(schritt)) s.add(p);
      for (const b of schritt.bausteine) if (b.art === "audio" || b.art === "video") s.add(b.quelle);
    }
  return s;
}

/** Reiner Text eines Knotenbaums (für Bildbeschreibungen und Vergleiche). */
export function textInhalt(knoten: TextKnoten[]): string {
  return knoten
    .map((k) => (typeof k === "string" ? k : k.tag === "br" ? " " : `${textInhalt(k.kinder)} `))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
