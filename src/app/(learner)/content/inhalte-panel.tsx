"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Check, ChevronDown, X } from "lucide-react";

import { TypIcon, type Typ } from "@/components/typ-icon";
import type { LektionsStatus, LektionsTyp, PanelLektion, PanelThema, PanelWoche } from "@/lib/programm-inhalte";
import type { ModulStatus } from "@/lib/programm";
import { cn } from "@/lib/utils";

// Programmseite (docs/design_handoff_programm_v8, Brief 2.5 + 3; SR-14, SR-59):
// Knopf "Inhalte des Moduls" und das Seitenpanel dazu -- fährt von rechts
// herein (mobil volle Breite), Hintergrund abgedunkelt; schließen per X,
// Klick daneben oder Esc (base-ui Dialog: Fokus ins Panel, beim Schließen
// zurück zum Knopf). &inhalte=1 in der Adresse öffnet es -- so öffnet ein
// Klick auf eine Modulkarte im Pfad direkt die Inhalte dieses Moduls
// (Wunsch Anna 2026-10-11) und man kann es verlinken. Darin je Woche (aufklappbar)
// eine Zeile je Thema (= Kurs) mit den Lektionen als Knöpfe (Anna 2026-10-27).

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

const KURZ: Record<LektionsTyp, string> = { live: "Live", selbstlern: "Selbstlernen", dokument: "Material", praxis: "Praxis" };

/**
 * Entscheidung Anna 2026-10-27 (zu viel Aufklappen): Woche aufklappbar, je
 * Thema eine Zeile mit Datum, die Lektionen als kleine Knöpfe rechts --
 * keine dritte Ebene mehr. Erledigt mit Häkchen, heute in Lime.
 */
function LektionKnopf({ l }: { l: PanelLektion }) {
  const klasse = cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand",
    l.status === "heute" ? "border-lime bg-lime text-on-lime" : "border-line bg-white text-ink",
    l.href && "hover:bg-subtle"
  );
  const status = LEKTION_STATUS[l.status].text;
  const inhalt = (
    <>
      <TypIcon typ={TYP[l.typ]} groesse="klein" />
      {KURZ[l.typ]}
      {l.status === "erledigt" && <Check className="size-3.5 text-progress" strokeWidth={3} aria-hidden="true" />}
    </>
  );
  const name = `${l.label}, ${status}`;
  if (!l.href) return <span className={klasse} aria-label={name}>{inhalt}</span>;
  return l.extern ? (
    <a href={l.href} target="_blank" rel="noopener noreferrer" className={klasse} aria-label={`${name}, Live-Raum (öffnet in neuem Tab)`}>
      {inhalt}
    </a>
  ) : (
    <Link href={l.href} className={klasse} aria-label={name}>
      {inhalt}
    </Link>
  );
}

function ThemaZeile({ t }: { t: PanelThema }) {
  const meta = t.lektionen.find((l) => l.meta)?.meta ?? null;
  const fertig = t.lektionen.length > 0 && t.erledigt === t.lektionen.length;
  return (
    <li className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[15px] leading-snug font-medium">
          {t.titel}
          {fertig && <Check className="size-4 shrink-0 text-progress" strokeWidth={3} aria-label="erledigt" />}
        </span>
        {meta && <span className="text-xs text-ink-muted">{meta}</span>}
      </span>
      <span className="flex flex-wrap gap-2 sm:justify-end">
        {t.lektionen.map((l) => (
          <LektionKnopf key={l.id} l={l} />
        ))}
      </span>
    </li>
  );
}

/**
 * Zeilen: das Sammel-Thema „Praxistag“ wird in eine Zeile je
 * Auftrag aufgeteilt -- sonst stünden dort nur Knöpfe „Praxis“ ohne Namen
 * (Anna 2026-10-27).
 */
function zeilenThemen(themen: PanelThema[]): PanelThema[] {
  return themen.flatMap((t) =>
    t.lektionen.length > 0 && t.lektionen.every((l) => l.typ === "praxis")
      ? t.lektionen.map((l) => ({
          id: `${t.id}-${l.id}`,
          titel: l.label,
          lektionen: [l],
          erledigt: l.status === "erledigt" ? 1 : 0,
          offen: false,
        }))
      : [t]
  );
}

function WochenKopf({ w }: { w: PanelWoche }) {
  const fertig = w.lektionen > 0 && w.erledigt === w.lektionen;
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-bold">{w.titel}</span>
        <span className="text-[13px] text-ink-muted tabular-nums">
          {w.erledigt}/{w.lektionen} Lektionen
        </span>
      </span>
      {w.aktuell && <span className="shrink-0 rounded-full bg-lime px-[9px] py-[3px] text-xs font-bold text-on-lime">Diese Woche</span>}
      {fertig && <Check className="size-[18px] shrink-0 text-progress" strokeWidth={3} aria-label="Woche erledigt" />}
    </>
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
      {/* Kein eigener Knopf mehr (Entscheidung Anna 2026-10-12): das Panel
          öffnet nur der Klick auf eine Modulkarte im Pfad. */}
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
              {wochen.map((w) => (
                <details key={w.id} open={w.offen} className="group/woche overflow-hidden rounded-zeile bg-card shadow-card">
                  <summary className={cn(AUFKLAPP, "px-5 py-[18px]")}>
                    <WochenKopf w={w} />
                    <ChevronDown
                      className="size-[18px] shrink-0 transition-transform group-open/woche:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {zeilenThemen(w.themen).map((t) => (
                      <ThemaZeile key={t.id} t={t} />
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
