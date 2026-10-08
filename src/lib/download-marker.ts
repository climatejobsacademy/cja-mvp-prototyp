// Marker "heruntergeladen" für Lernmaterialien: gilt nur für die laufende
// Browser-Sitzung (sessionStorage), nichts geht in die Datenbank
// (Entscheidung 2026-10-07). Als kleiner Store für useSyncExternalStore:
// setzen() benachrichtigt die Abonnenten selbst, weil setItem im selben Tab
// kein storage-Ereignis auslöst. Ohne Browser-Import, damit node:test die
// Logik mit einem Fake-Storage prüfen kann.

export const MARKER_PREFIX = "lernmaterial-heruntergeladen:";

type SpeicherLike = Pick<Storage, "getItem" | "setItem" | "key" | "length">;

export function erstelleDownloadMarker(speicher: () => SpeicherLike | null) {
  const zuhoerer = new Set<() => void>();

  function abonnieren(zuhoeren: () => void) {
    zuhoerer.add(zuhoeren);
    return () => {
      zuhoerer.delete(zuhoeren);
    };
  }

  /** Markierte Material-IDs als stabiler String (sortiert, kommagetrennt). */
  function lesen(): string {
    try {
      const s = speicher();
      if (!s) return "";
      const ids: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const key = s.key(i);
        if (key?.startsWith(MARKER_PREFIX)) ids.push(key.slice(MARKER_PREFIX.length));
      }
      return ids.sort().join(",");
    } catch {
      // sessionStorage nicht verfügbar (z. B. gesperrt): ohne Marker weiter.
      return "";
    }
  }

  /** Setzt den Marker; blockiert nie, auch wenn der Speicher nicht geht. */
  function setzen(id: string) {
    try {
      speicher()?.setItem(MARKER_PREFIX + id, "1");
    } catch {
      // siehe lesen()
    }
    for (const zuhoeren of zuhoerer) zuhoeren();
  }

  return { abonnieren, lesen, setzen };
}

export function markierteIds(snapshot: string): Set<string> {
  return new Set(snapshot ? snapshot.split(",") : []);
}
