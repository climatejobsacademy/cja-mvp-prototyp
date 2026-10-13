"use client";

import { useSyncExternalStore } from "react";
import { CircleCheck, FileText, Link2 } from "lucide-react";

import { DateiVorschau } from "@/components/datei-vorschau";
import { erstelleDownloadMarker, markierteIds } from "@/lib/download-marker";
import type { Material } from "@/lib/queries/materialien";
import { cn } from "@/lib/utils";

// "heruntergeladen" nur für die laufende Browser-Sitzung (sessionStorage),
// nichts davon geht in die Datenbank. Logik in src/lib/download-marker.ts.
const downloadMarker = erstelleDownloadMarker(() =>
  typeof window === "undefined" ? null : window.sessionStorage
);

// Kacheln (Entscheidung Anna 2026-10-12): Klick auf die Kachel öffnet die
// Vorschau mit "Herunterladen" im Fenster (bzw. den Link, bei Office-Dateien
// direkt den Download). Kein eigener Download-Knopf auf der Kachel.
const KACHEL =
  "flex h-full w-full flex-col items-start gap-3 rounded-zeile bg-subtle p-4 text-left text-ink outline-none transition-[background-color] duration-150 hover:bg-brand-tint focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none";

/**
 * Lernmaterialien einer Lektion (SR-68) als Kacheln unter "Zum Nachlesen".
 * Die Vorschau öffnet ein Fenster über der Seite (DateiVorschau), Download ist
 * ein normaler Link; der signierte Link entsteht erst beim Aufruf im Route
 * Handler. Kein next/link, damit nichts vorab geladen wird. Bilder werden
 * nirgends inline gezeigt (kein img), der Titel steckt im zugänglichen Namen.
 */
export function MaterialienListe({
  lessonId,
  materialien,
  ueberschrift = "Zum Nachlesen",
}: {
  lessonId: string;
  materialien: Material[];
  ueberschrift?: string;
}) {
  const heruntergeladen = markierteIds(
    useSyncExternalStore(downloadMarker.abonnieren, downloadMarker.lesen, () => "")
  );

  const basis = `/content/${lessonId}/material`;
  const markieren = (id: string) => downloadMarker.setzen(id);

  return (
    <section aria-labelledby="materialien-ueberschrift" className="flex flex-col gap-3">
      <h2 id="materialien-ueberschrift" className="text-base font-bold text-ink">
        {ueberschrift}
      </h2>
      {/* Gleichmäßige Reihen: drei Spalten nur, wenn die Zahl aufgeht. */}
      <ul className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", materialien.length % 3 === 0 && "lg:grid-cols-3")}>
        {materialien.map((m) => {
          const inhalt = (
            <>
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand">
                {m.art === "datei" ? (
                  <FileText className="size-5" aria-hidden="true" />
                ) : (
                  <Link2 className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-snug font-semibold break-words">{m.titel}</span>
                {m.art !== "datei" && <span className="text-[13px] text-ink-muted">externer Link</span>}
                {heruntergeladen.has(m.id) && (
                  <span className="flex items-center gap-1 text-[13px] text-ink-muted">
                    <CircleCheck className="size-3.5 text-progress" aria-hidden="true" />
                    heruntergeladen
                  </span>
                )}
              </span>
            </>
          );
          const downloadHref = `${basis}/${m.id}?aktion=download`;
          return (
            <li key={m.id} className="relative">
              {m.art !== "datei" ? (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Öffnen: ${m.titel} (externer Link, öffnet in neuem Tab)`}
                  className={KACHEL}
                >
                  {inhalt}
                </a>
              ) : (
                <>
                  {m.vorschau ? (
                    <DateiVorschau
                      titel={m.titel}
                      href={`${basis}/${m.id}?aktion=vorschau`}
                      ausloeserLabel={`Vorschau: ${m.titel}`}
                      ausloeserKlasse={KACHEL}
                      downloadHref={downloadHref}
                      onDownload={() => markieren(m.id)}
                    >
                      {inhalt}
                    </DateiVorschau>
                  ) : (
                    <a
                      href={downloadHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Download: ${m.titel}`}
                      onClick={() => markieren(m.id)}
                      className={KACHEL}
                    >
                      {inhalt}
                    </a>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
