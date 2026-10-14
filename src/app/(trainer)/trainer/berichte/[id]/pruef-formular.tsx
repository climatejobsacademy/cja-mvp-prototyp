"use client";

import { useState, useTransition } from "react";
import { Check, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KOMMENTAR_MIN, pruefAktion, type AktuellePruefung, type Entscheidung } from "@/lib/praxisbericht";

import { berichtPruefen } from "../../actions";

// Freigeben oder zurückgeben (SR-82). Zurückgeben nur mit Kommentar. Ist
// schon entschieden, legt eine andere Entscheidung nach Rückfrage einen
// Storno-Eintrag an (E4, SR-07 -- kein Ändern).

const TEXT: Record<Entscheidung, string> = { verified: "freigegeben", rejected: "zurückgegeben" };

export function PruefFormular({ captureId, aktuell }: { captureId: string; aktuell: AktuellePruefung }) {
  const [laeuft, startTransition] = useTransition();
  const [kommentar, setKommentar] = useState("");
  const [meldung, setMeldung] = useState<{ fehler: boolean; text: string } | null>(null);
  const [rueckfrage, setRueckfrage] = useState<Entscheidung | null>(null);

  function speichern(entscheidung: Entscheidung) {
    setMeldung(null);
    startTransition(async () => {
      const ergebnis = await berichtPruefen(captureId, entscheidung, kommentar || null);
      if (ergebnis.ok) {
        setKommentar("");
        setMeldung({ fehler: false, text: `Bericht ${TEXT[entscheidung]}.` });
      } else {
        setMeldung({ fehler: true, text: ergebnis.meldung });
      }
    });
  }

  function waehlen(entscheidung: Entscheidung) {
    const aktion = pruefAktion(aktuell, entscheidung, kommentar);
    if (aktion.art === "fehler") return setMeldung({ fehler: true, text: aktion.meldung });
    if (aktion.art === "unveraendert") return setMeldung({ fehler: false, text: `Ist bereits ${TEXT[entscheidung]}.` });
    if (aktion.art === "storno") return setRueckfrage(entscheidung);
    speichern(entscheidung);
  }

  return (
    <section className="rounded-karte bg-white p-4 shadow-card md:p-5" aria-labelledby="pruefen">
      <h2 id="pruefen" className="text-sm font-semibold text-ink">
        {aktuell ? "Entscheidung korrigieren" : "Bericht prüfen"}
      </h2>
      {aktuell && (
        <p className="mt-1 text-sm text-ink-muted">
          Aktuell: {TEXT[aktuell.entscheidung]}. Eine Korrektur wird als neuer Eintrag gespeichert.
        </p>
      )}
      <label htmlFor="kommentar" className="mt-3 block text-sm text-ink">
        Kommentar <span className="text-ink-muted">(beim Zurückgeben Pflicht)</span>
      </label>
      <textarea
        id="kommentar"
        value={kommentar}
        onChange={(e) => setKommentar(e.target.value)}
        rows={3}
        maxLength={1000}
        className="mt-1 w-full rounded-lg border border-line bg-white p-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
        placeholder="Was fehlt noch, was ist gut gelungen?"
      />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={laeuft}
          onClick={() => waehlen("verified")}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <Check className="size-4" aria-hidden="true" />
          Freigeben
        </button>
        <button
          type="button"
          disabled={laeuft || kommentar.trim().length < KOMMENTAR_MIN}
          onClick={() => waehlen("rejected")}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-ink bg-white px-4 text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <Undo2 className="size-4" aria-hidden="true" />
          Zurückgeben
        </button>
      </div>
      {meldung && (
        <p role={meldung.fehler ? "alert" : "status"} className={meldung.fehler ? "mt-2 text-sm text-destructive" : "mt-2 text-sm text-progress"}>
          {laeuft ? "Wird gespeichert …" : meldung.text}
        </p>
      )}

      <Dialog open={rueckfrage !== null} onOpenChange={(offen) => !offen && setRueckfrage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-ink">Entscheidung korrigieren?</DialogTitle>
            <DialogDescription>
              {aktuell &&
                rueckfrage &&
                `Der Bericht ist ${TEXT[aktuell.entscheidung]}. Die Korrektur auf „${TEXT[rueckfrage]}“ wird als neuer Eintrag gespeichert; der alte bleibt im Verlauf.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setRueckfrage(null)}>
              Abbrechen
            </Button>
            <Button
              className="h-11"
              onClick={() => {
                if (rueckfrage) speichern(rueckfrage);
                setRueckfrage(null);
              }}
            >
              Korrigieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
