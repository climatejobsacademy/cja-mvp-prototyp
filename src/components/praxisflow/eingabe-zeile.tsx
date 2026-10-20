"use client";

// Nur Demo – Audio wird vom Browser-Anbieter verarbeitet, für Pilot Datenschutzprüfung nötig.
// (Diktat über useDiktat, siehe use-diktat.ts)

import { useState } from "react";
import { Mic, Plus, Square } from "lucide-react";

import { zeilenZuTexten } from "@/lib/praxisflow-logik";
import { cn } from "@/lib/utils";

import { FOKUS, SEKUNDAER } from "./stile";
import { DIKTAT_AN } from "@/lib/praxisflow-daten";

import { useDiktat } from "./use-diktat";

export type EingabeTexte = {
  hinzufuegen: string;
  diktieren: string;
  stoppen: string;
  hoertZu: string;
  verweigert: string;
  fehler: string;
};

/**
 * Eingabezeile nach Messenger-Muster für die Listen in Planen: leeres Feld →
 * Mikrofon, sobald getippt wird → "Hinzufügen"; Enter fügt ebenfalls hinzu
 * (Umschalt+Enter macht eine neue Zeile). Mehrzeiliger Text wird zeilenweise
 * zu einzelnen Einträgen, jeder diktierte Satz ebenso. Ohne Spracherkennung
 * bleibt nur Tippen. Nichts hängt am Hover.
 */
export function EingabeZeile({
  id,
  label,
  platzhalter,
  texte,
  onTexte,
}: {
  id: string;
  /** Beschriftung für Screenreader, z. B. "Werkzeug hinzufügen" */
  label: string;
  platzhalter: string;
  texte: EingabeTexte;
  onTexte: (texte: string[]) => void;
}) {
  const [text, setText] = useState("");
  const diktat = useDiktat(onTexte, texte);
  const getippt = text.trim().length > 0;
  const diktatMoeglich = DIKTAT_AN && diktat.verfuegbar;

  function hinzufuegen() {
    const neu = zeilenZuTexten(text);
    if (neu.length > 0) onTexte(neu);
    setText("");
  }

  const rund = cn(SEKUNDAER, "w-auto shrink-0 sm:w-auto");

  return (
    <div className="flex flex-col gap-1.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          hinzufuegen();
        }}
        className="flex items-end gap-2"
      >
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          id={id}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              hinzufuegen();
            }
          }}
          placeholder={platzhalter}
          // Wächst mit dem Inhalt (bis 6 Zeilen); Abstand nach unten, damit die
          // Zeile beim Fokus nicht direkt an der Bildschirmtastatur klebt.
          className={cn(
            "field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none scroll-mb-24 rounded-[22px] border border-line bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-subtle",
            FOKUS
          )}
        />
        {diktat.hoert ? (
          <button type="button" onClick={diktat.stoppen} aria-label={`${texte.hoertZu} ${texte.stoppen}`} className={cn(rund, "bg-praxis-tint")}>
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-praxis" aria-hidden="true" />
            <span aria-hidden="true">{texte.hoertZu}</span>
            <Square aria-hidden="true" />
          </button>
        ) : getippt || !diktatMoeglich ? (
          <button type="submit" disabled={!getippt} className={rund}>
            <Plus aria-hidden="true" />
            {texte.hinzufuegen}
          </button>
        ) : (
          <button type="button" onClick={diktat.starten} aria-label={texte.diktieren} className={cn(rund, "size-11 px-0")}>
            <Mic aria-hidden="true" />
          </button>
        )}
      </form>
      <p role="status" className={diktat.meldung ? "text-sm text-ink-muted" : "sr-only"}>
        {diktat.meldung ?? (diktat.hoert ? texte.hoertZu : "")}
      </p>
    </div>
  );
}
