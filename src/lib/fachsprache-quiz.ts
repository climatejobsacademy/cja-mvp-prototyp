// Quiz der Fachsprache-Einheit (Stufe 2, SR-84): Regeln als reine
// Funktion, ohne React, getestet in src/lib/fachsprache-quiz.test.ts.
//
// Ablauf je Frage: Antwort wählen → "Weiter" prüft → falsch: Hinweis, Auswahl
// leer, neu wählen → richtig: Erklärung, "Weiter" geht zur nächsten Frage.
// Nach der letzten Frage ist das Quiz fertig; "Wiederholen" beginnt von vorn,
// beliebig oft. Der Zustand zählt keine richtigen oder falschen Antworten:
// das Quiz ist freiwillig und hat kein Ergebnis (kein Server, Regel 6).

/** Was die Regeln von einer Frage brauchen. */
export type QuizFrageRegel = { antworten: readonly unknown[]; richtig: number };

export type QuizStatus = "waehlen" | "falsch" | "richtig";

export type QuizZustand = {
  /** Index der aktuellen Frage */
  nr: number;
  /** gewählte Antwort, null = noch keine (oder nach "falsch" geleert) */
  wahl: number | null;
  status: QuizStatus;
  /** nach der letzten richtig beantworteten Frage "Weiter" gedrückt */
  fertig: boolean;
};

export type QuizAktion =
  | { typ: "waehlen"; antwort: number }
  | { typ: "weiter" }
  | { typ: "zurueck" }
  | { typ: "wiederholen" };

export function quizStart(): QuizZustand {
  return { nr: 0, wahl: null, status: "waehlen", fertig: false };
}

/** Nächster Zustand; unzulässige Aktionen ändern nichts. */
export function quizSchritt(z: QuizZustand, aktion: QuizAktion, fragen: readonly QuizFrageRegel[]): QuizZustand {
  if (aktion.typ === "wiederholen") return quizStart();
  if (z.fertig || fragen.length === 0) return z;
  const frage = fragen[z.nr];

  switch (aktion.typ) {
    case "waehlen": {
      // Nach "richtig" ist die Antwort fest; ungültige Indizes zählen nicht.
      if (z.status === "richtig") return z;
      if (!Number.isInteger(aktion.antwort) || aktion.antwort < 0 || aktion.antwort >= frage.antworten.length) return z;
      return { ...z, wahl: aktion.antwort, status: "waehlen" };
    }
    case "weiter": {
      if (z.status === "richtig") {
        return z.nr + 1 < fragen.length ? { nr: z.nr + 1, wahl: null, status: "waehlen", fertig: false } : { ...z, fertig: true };
      }
      if (z.wahl === null) return z;
      return z.wahl === frage.richtig ? { ...z, status: "richtig" } : { ...z, wahl: null, status: "falsch" };
    }
    case "zurueck": {
      // Zur vorigen Frage, die schon richtig beantwortet war.
      if (z.nr === 0) return z;
      return { nr: z.nr - 1, wahl: fragen[z.nr - 1].richtig, status: "richtig", fertig: false };
    }
  }
}

/** Ist "Weiter" bedienbar? Erst mit einer Auswahl oder nach "richtig". */
export function weiterMoeglich(z: QuizZustand): boolean {
  return !z.fertig && (z.status === "richtig" || z.wahl !== null);
}

/** Beschriftung von "Weiter": prüft zuerst, nach "richtig" geht es weiter. */
export function weiterText(z: QuizZustand, anzahl: number): string {
  if (z.status !== "richtig") return "Weiter";
  return z.nr + 1 < anzahl ? "Nächste Frage" : "Weiter zu den Sätzen";
}

/** Erklärung erst nach der richtigen Antwort zeigen. */
export function erklaerungSichtbar(z: QuizZustand): boolean {
  return z.status === "richtig";
}
