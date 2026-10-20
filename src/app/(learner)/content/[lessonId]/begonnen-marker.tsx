"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Markiert die Lektion beim ersten Öffnen als begonnen (SR-73). Wird nur
 * gerendert, wenn die Lektion noch "offen" ist; zeigt selbst nichts an.
 * Nach einem neuen Eintrag lädt die Seite ihre Daten neu (Status-Badge).
 */
export function BegonnenMarker({ lessonId }: { lessonId: string }) {
  const router = useRouter();

  useEffect(() => {
    const abbruch = new AbortController();
    fetch(`/content/${lessonId}/begonnen`, { method: "POST", signal: abbruch.signal })
      .then((antwort) => (antwort.ok ? antwort.json() : null))
      .then((daten: { neu?: boolean } | null) => {
        if (daten?.neu && !abbruch.signal.aborted) router.refresh();
      })
      .catch(() => {
        // Abgebrochen oder offline: beim nächsten Öffnen wird es erneut versucht.
      });
    return () => abbruch.abort();
  }, [lessonId, router]);

  return null;
}
