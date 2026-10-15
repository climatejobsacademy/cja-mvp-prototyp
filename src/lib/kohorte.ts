// Kohortensicht (SR-30, 0034): reine Texthilfen ohne Datenbank, getestet in
// src/lib/kohorte.test.ts.

/** Wie viele Avatare die Karte "Deine Kohorte" zeigt; der Rest steht als "+n". */
export const KOHORTE_AVATARE_MAX = 5;

/** "5 Lernende" -- inklusive der eigenen Person; eine allein: "Du bist allein in deiner Kohorte". */
export function kohortenAnzahlText(andere: number): string {
  if (andere <= 0) return "Du bist bisher allein in deiner Kohorte";
  return `${andere + 1} Lernende`;
}

/** Screenreader-Text für die Avatarreihe: Namen der ersten und Zahl der übrigen. */
export function avatarReiheLabel(namen: string[]): string {
  if (namen.length === 0) return "";
  const gezeigt = namen.slice(0, KOHORTE_AVATARE_MAX);
  const rest = namen.length - gezeigt.length;
  return rest > 0 ? `${gezeigt.join(", ")} und ${rest} weitere` : gezeigt.join(", ");
}
