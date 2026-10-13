"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, Check, ChevronDown, ChevronRight, X } from "lucide-react";

import { SegmentProgress } from "@/components/segment-progress";
import { TypIcon, type Typ } from "@/components/typ-icon";
import type { LektionsStatus, LektionsTyp, PanelLektion, PanelWoche } from "@/lib/programm-inhalte";
import type { ModulStatus } from "@/lib/programm";
import { cn } from "@/lib/utils";

// Programmseite (docs/design_handoff_programm_v8, Brief 2.5 + 3; SR-14, SR-59):
// Knopf "Inhalte des Moduls" und das Seitenpanel dazu -- fährt von rechts
// herein (mobil volle Breite), Hintergrund abgedunkelt; schließen per X,
// Klick daneben oder Esc (base-ui Dialog: Fokus ins Panel, beim Schließen
// zurück zum Knopf). &inhalte=1 in der Adresse öffnet es -- so öffnet ein
// Klick auf eine Modulkarte im Pfad direkt die Inhalte dieses Moduls
// (Wunsch Anna 2026-10-11) und man kann es verlinken. Darin Woche → Thema (= Kurs) → Lektion wie bisher
// auf der Programmseite, jeweils aufklappbar.

const STATUS: Record<ModulStatus, { text: string; klasse: string }> = {
  abgeschlossen: { text: "Abgeschlossen", klasse: "bg-subtle text-progress" },
  aktuell: { text: "Aktuell", klasse: "bg-lime text-on-lime" },
  kommend: { text: "Kommt noch", klasse: "bg-subtle text-ink-muted" },
};

const LEKTION_STATUS: Record<LektionsStatus, { text: string; klasse: string }> = {
  offen: { text: "Offen", klasse: "border-line bg-white text-ink" },
  erledigt: { text: "Erledigt", klasse: "border-subtle bg-subtle text-progress" },
  heute: { text: "Heute", klasse: "border-lime bg-lime text-on-lime" },
};

const TYP: Record<LektionsTyp, Typ> = { live: "live", selbstlern: "selbstlern", dokument: "dokument", praxis: "praxis" };

/** &inhalte=1 in der Adresse setzen bzw. entfernen, ohne die Seite neu zu laden. */
function adresseMerken(offen: boolean) {
  const url = new URL(window.location.href);
  if (offen) url.searchParams.set("inhalte", "1");
  else url.searchParams.delete("inhalte");
  window.history.replaceState(window.history.state, "", url);
}

const AUFKLAPP =
  "flex w-full cursor-pointer list-none items-center gap-3 text-left outline-none transition-[background-color] duration-150 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand motion-reduce:transition-none [&::-webkit-details-marker]:hidden";

function Lektion({ l }: { l: PanelLektion }) {
  const status = LEKTION_STATUS[l.status];
  const inhalt = (
    <>
      <TypIcon typ={TYP[l.typ]} groesse="gross" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px]">{l.label}</span>
        {l.meta && <span className="text-xs text-ink-muted">{l.meta}</span>}
      </span>
      <span className={cn("shrink-0 rounded-full border px-[11px] py-[5px] text-[13px] font-semibold", status.klasse)}>{status.text}</span>
      {l.href && <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
    </>
  );
  const klasse = "flex items-center gap-3.5 rounded-xl p-2 text-ink";
  const fokus = "outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand";
  if (!l.href) return <div className={klasse}>{inhalt}</div>;
  return l.extern ? (
    <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn(klasse, fokus)} aria-label={`${l.label}, ${status.text}, Live-Raum (öffnet in neuem Tab)`}>
      {inhalt}
    </a>
  ) : (
    <Link href={l.href} className={cn(klasse, fokus)}>
      {inhalt}
    </Link>
  );
}

export function InhaltePanel({
  ueberzeile,
  zeitraum,
  name,
  status,
  wochen,
  oeffnen,
}: {
  ueberzeile: string;
  zeitraum: string | null;
  name: string;
  status: ModulStatus;
  wochen: PanelWoche[];
  /**
   * Bei jedem Seitenaufruf mit &inhalte=1 eine neue Kennung vom Server
   * (sonst null): so öffnet jeder Klick auf eine Modulkarte das Panel, auch
   * dieselbe Karte nach dem Schließen noch einmal.
   */
  oeffnen: string | null;
}) {
  // Knopf, X, Esc und Klick daneben steuern den Zustand direkt; eine neue
  // Kennung öffnet ihn. Abgleich während des Renderns statt im Effekt
  // (React-Muster "Zustand bei geänderten Props anpassen").
  const [offen, setOffen] = useState(oeffnen !== null);
  const [letzteKennung, setLetzteKennung] = useState(oeffnen);
  if (oeffnen !== letzteKennung) {
    setLetzteKennung(oeffnen);
    if (oeffnen) setOffen(true);
  }

  return (
    <Dialog.Root
      open={offen}
      onOpenChange={(neu) => {
        setOffen(neu);
        adresseMerken(neu);
      }}
    >
      <Dialog.Trigger className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-[11px] text-sm font-bold text-white outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
        Inhalte des Moduls
        <ArrowRight className="size-4" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] flex-col gap-6 overflow-y-auto bg-page px-4 pt-5 pb-12 text-ink shadow-card outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:animate-none md:px-8 md:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
                  {ueberzeile}
                  {zeitraum && ` · ${zeitraum}`}
                </span>
                <span className={cn("rounded-full px-[9px] py-[3px] text-xs font-semibold", STATUS[status].klasse)}>{STATUS[status].text}</span>
              </div>
              <Dialog.Title className="text-[24px] leading-tight font-bold md:text-[26px]">{name}</Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Schließen"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {wochen.length === 0 ? (
            <p className="text-sm text-ink-muted">Für dieses Modul sind noch keine Inhalte freigeschaltet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {wochen.map((w) => {
                const fertig = w.lektionen > 0 && w.erledigt === w.lektionen;
                return (
                  <details key={w.id} open={w.offen} className="group/woche overflow-hidden rounded-zeile bg-card shadow-card">
                    <summary className={cn(AUFKLAPP, "px-5 py-[18px]")}>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-base font-bold">{w.titel}</span>
                        <span className="text-[13px] text-ink-muted tabular-nums">
                          {w.erledigt}/{w.lektionen} Lektionen
                        </span>
                      </span>
                      {w.aktuell && (
                        <span className="shrink-0 rounded-full bg-lime px-[9px] py-[3px] text-xs font-bold text-on-lime">Diese Woche</span>
                      )}
                      {fertig && (
                        <Check className="size-[18px] shrink-0 text-progress" strokeWidth={3} aria-label="Woche erledigt" />
                      )}
                      <ChevronDown
                        className="size-[18px] shrink-0 transition-transform group-open/woche:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="border-t border-line">
                      {w.themen.map((t) => (
                        <details key={t.id} open={t.offen} className="group/thema border-b border-line last:border-b-0">
                          <summary className={cn(AUFKLAPP, "px-5 py-3.5")}>
                            <span className="flex min-w-0 flex-1 flex-col gap-2">
                              <span className="text-[15px] leading-snug font-medium">{t.titel}</span>
                              <SegmentProgress
                                value={t.erledigt}
                                max={t.lektionen.length}
                                label={`${t.erledigt} von ${t.lektionen.length} Lektionen erledigt`}
                              />
                              <span className="text-[13px] text-ink-muted tabular-nums" aria-hidden="true">
                                {t.erledigt}/{t.lektionen.length} Lektionen
                              </span>
                            </span>
                            <ChevronDown
                              className="size-[18px] shrink-0 transition-transform group-open/thema:rotate-180 motion-reduce:transition-none"
                              aria-hidden="true"
                            />
                          </summary>
                          <ul className="flex flex-col pr-3 pb-2.5 pl-6 md:pl-9">
                            {t.lektionen.map((l) => (
                              <li key={l.id}>
                                <Lektion l={l} />
                              </li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
