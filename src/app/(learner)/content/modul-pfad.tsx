import Link from "next/link";
import { Check, GraduationCap } from "lucide-react";

import type { ModulStatus } from "@/lib/programm";
import { cn } from "@/lib/utils";

import { AktuellSichtbar } from "./aktuell-sichtbar";

// Programmseite v8 (docs/design_handoff_programm_v8, Brief 2.3, SR folgt):
// "Dein Weg" -- alle Module nebeneinander, verbunden durch eine Linie mit
// nummerierten Punkten. Klick wählt ein Modul (?modul=…), zeigt darunter
// dessen Tracking und öffnet direkt seine Inhalte im Seitenpanel
// (&inhalte=1, Wunsch Anna 2026-10-11).

export type PfadModul = {
  id: string;
  nummer: number;
  /** "Modul 1", bei der Prüfungsvorbereitung "Abschluss" */
  ueberzeile: string;
  name: string;
  status: ModulStatus;
  /** "28.09. – 30.10.2026", eigene Zeile; null = unbekannt */
  zeitraum: string | null;
  /** Ende der Reise (Prüfungsvorbereitung): eigener Punkt mit Abschluss-Grafik */
  ziel: boolean;
};

const STATUS_TEXT: Record<ModulStatus, string> = {
  abgeschlossen: "abgeschlossen",
  aktuell: "hier bist du",
  kommend: "kommt noch",
};

export function ModulPfad({
  module,
  gewaehltId,
  href,
}: {
  module: PfadModul[];
  gewaehltId: string | null;
  href: (modulId: string) => string;
}) {
  return (
    <section aria-labelledby="dein-weg" className="flex flex-col gap-4 text-eco-deep-green">
      <h2 id="dein-weg" className="text-xl font-bold">
        Dein Weg
      </h2>
      {/* Viele Module: horizontal scrollbar (Brief 2.3). */}
      <ol className="grid auto-cols-[minmax(160px,1fr)] grid-flow-col overflow-x-auto p-1 pt-1.5 pb-3">
        {module.map((m, i) => {
          const gewaehlt = m.id === gewaehltId;
          const aktuell = m.status === "aktuell";
          // Wunsch Anna 2026-10-11: das Modul nach dem aktuellen als "Als Nächstes" kennzeichnen.
          const naechstes = m.status === "kommend" && module[i - 1]?.status === "aktuell";
          const letztes = i === module.length - 1;
          return (
            <li key={m.id} id={aktuell ? "modul-aktuell" : undefined} className="flex flex-col gap-4 pr-3">
              <div aria-hidden="true" className="flex items-center">
                <span
                  className={cn(
                    "flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold",
                    m.ziel
                      ? "border-charge-green bg-charge-green text-eco-deep-green"
                      : m.status === "abgeschlossen"
                        ? "border-eco-green bg-eco-green text-white"
                        : aktuell
                          ? "border-eco-deep-green bg-eco-deep-green text-white"
                          : "border-border bg-white text-muted-foreground"
                  )}
                >
                  {m.ziel ? (
                    <GraduationCap className="size-4" strokeWidth={2.25} />
                  ) : m.status === "abgeschlossen" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    m.nummer
                  )}
                </span>
                <span
                  className={cn(
                    "ml-2 h-0.5 flex-1",
                    letztes ? "bg-transparent" : m.status === "abgeschlossen" ? "bg-eco-green" : "bg-border"
                  )}
                />
              </div>
              <Link
                href={href(m.id)}
                scroll={false}
                aria-current={gewaehlt ? "true" : undefined}
                aria-label={`${m.ueberzeile}: ${m.name}, ${m.zeitraum ? `${m.zeitraum}, ` : ""}${naechstes ? "als Nächstes" : STATUS_TEXT[m.status]}, Inhalte öffnen`}
                className={cn(
                  "group/karte relative flex flex-1 flex-col items-start gap-1.5 rounded-[14px] border px-4 py-3.5 outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2 motion-reduce:transition-none",
                  aktuell
                    ? "border-eco-deep-green bg-eco-deep-green text-white"
                    : m.ziel
                      ? "border-transparent bg-off-white hover:bg-success"
                      : "border-border bg-white hover:bg-off-white",
                  m.status === "kommend" && "text-muted-foreground",
                  gewaehlt && "ring-2 ring-eco-deep-green ring-offset-2"
                )}
              >
                <span className={cn("text-xs font-semibold tracking-[0.08em] uppercase", aktuell ? "text-white/75" : "text-muted-foreground")}>
                  {m.ueberzeile}
                </span>
                {/* Wunsch Anna 2026-10-11: Zeitraum bei jedem Modul, direkt unter der
                    Überzeile -- so stehen alle Daten auf einer Linie. */}
                <span className={cn("block min-h-4 text-xs whitespace-nowrap tabular-nums", aktuell ? "text-white/75" : "text-muted-foreground")}>
                  {m.zeitraum}
                </span>
                {/* Lange Wörter trennen statt über den Rahmen laufen. */}
                <span className="w-full text-[15px] leading-snug font-bold hyphens-auto break-words">{m.name}</span>
                {/* Rückmeldung Anna 2026-10-11: "Hier bist du"/"Als Nächstes" als Label
                    auf dem oberen Rand -- braucht keinen Platz in der Karte, so bleibt
                    nirgends eine leere Zeile. */}
                {(aktuell || naechstes) && (
                  <span
                    className={cn(
                      "absolute -top-[11px] left-3.5 rounded-full px-[9px] py-[2px] text-xs font-bold",
                      aktuell ? "bg-charge-green text-eco-deep-green" : "border border-border bg-white font-semibold text-eco-deep-green"
                    )}
                  >
                    {aktuell ? "Hier bist du" : "Als Nächstes"}
                  </span>
                )}
                {/* Unten, auf allen Karten auf einer Linie: "Details" als Hinweis, dass die
                    Karte die Inhalte öffnet -- als Wort statt Pfeil, ein Pfeil liest sich
                    im Pfad wie "zum nächsten Modul". */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-auto pt-1 text-xs font-semibold underline underline-offset-2 group-hover/karte:decoration-2",
                    aktuell ? "text-white" : "text-eco-deep-green"
                  )}
                >
                  Details
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {module.some((m) => m.status === "aktuell") && <AktuellSichtbar zielId="modul-aktuell" />}
    </section>
  );
}
