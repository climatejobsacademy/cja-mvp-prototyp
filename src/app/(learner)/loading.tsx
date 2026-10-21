// Lade-Anzeige für alle Seiten der Lernenden (Ladezeit, Anna 2026-10-21):
// Nach einem Klick im Menü erscheint sofort dieser ruhige Platzhalter statt
// der alten Seite, bis die neue fertig ist. Kopf und Menü bleiben stehen
// (Layout). Next.js lädt ihn beim Sichtbarwerden der Menü-Links schon vor.
export default function Laedt() {
  return (
    <div data-breit className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Seite wird geladen …</span>
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="h-4 w-40 rounded-full bg-subtle motion-safe:animate-pulse" />
        <div className="h-10 w-72 max-w-full rounded-xl bg-subtle motion-safe:animate-pulse" />
      </div>
      <div className="grid gap-4 min-[960px]:grid-cols-[2fr_1fr]" aria-hidden="true">
        <div className="h-48 rounded-karte bg-card shadow-card motion-safe:animate-pulse" />
        <div className="h-48 rounded-karte bg-card shadow-card motion-safe:animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        <div className="h-24 rounded-karte bg-card shadow-card motion-safe:animate-pulse" />
        <div className="h-24 rounded-karte bg-card shadow-card motion-safe:animate-pulse" />
        <div className="h-24 rounded-karte bg-card shadow-card motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
