"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareText, RefreshCw, Reply, Send, Trash2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { zeitpunktInBerlin } from "@/lib/date";
import { MAX_ZEICHEN, beitragNormalisieren, zeichenAnzahl, type ThreadBeitrag } from "@/lib/lektion-thread";
import type { LektionThread as LektionThreadDaten } from "@/lib/queries/lektion-thread";
import { cn } from "@/lib/utils";

import { beitragLoeschen, beitragSchreiben } from "./thread-actions";

const AKTION = cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-3 sm:h-9");
const KLEINE_AKTION = cn(buttonVariants({ variant: "ghost" }), "h-11 gap-1.5 px-2 text-[13px] sm:h-8");

/**
 * Fragen-Thread unter einer Lektion (SR folgt (Fragen-Thread)). Reiner Text:
 * React escaped alles, kein Markdown, keine Links, Zeilenumbrüche bleiben
 * (whitespace-pre-wrap). Kein Echtzeit: "Aktualisieren" lädt neu. Buttons
 * werden nur ein- oder ausgeblendet, entscheiden tut das Backend.
 */
export function LektionThread({ lessonId, thread }: { lessonId: string; thread: LektionThreadDaten }) {
  const router = useRouter();
  const [aktualisiert, startAktualisieren] = useTransition();
  const [antwortAuf, setAntwortAuf] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [fehler, setFehler] = useState<string>("");
  const [loescht, startLoeschen] = useTransition();

  function aktualisieren() {
    setFehler("");
    startAktualisieren(() => router.refresh());
  }

  function loeschen(beitrag: ThreadBeitrag) {
    const eigener = beitrag.person_id === thread.personId;
    const frage = eigener ? "Deinen Beitrag wirklich löschen?" : "Diesen Beitrag wirklich löschen?";
    if (!window.confirm(frage)) return;
    setFehler("");
    startLoeschen(async () => {
      const ergebnis = await beitragLoeschen(lessonId, beitrag.id);
      if (!ergebnis.ok) {
        setFehler(ergebnis.fehler);
        return;
      }
      setStatus("Beitrag gelöscht.");
      router.refresh();
    });
  }

  function darfLoeschen(beitrag: ThreadBeitrag) {
    return !beitrag.geloescht_am && (beitrag.person_id === thread.personId || thread.istModeration);
  }

  function gesendet() {
    setAntwortAuf(null);
    setFehler("");
    setStatus("Beitrag gesendet.");
    router.refresh();
  }

  return (
    <section aria-labelledby="thread-ueberschrift" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="thread-ueberschrift" className="flex items-center gap-2 text-[15px] font-semibold text-eco-deep-green">
          <MessageSquareText className="size-[18px] text-eco-green" aria-hidden="true" />
          Fragen zur Lektion
        </h2>
        <button type="button" onClick={aktualisieren} disabled={aktualisiert} className={AKTION}>
          <RefreshCw className={cn(aktualisiert && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
          {aktualisiert ? "Wird aktualisiert …" : "Aktualisieren"}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {fehler && (
        <p role="alert" className="rounded-lg border-2 border-coral p-3 text-sm text-eco-deep-green">
          {fehler}
        </p>
      )}

      {thread.mehrAlsLimit && (
        <p className="text-[13px] text-muted-foreground">
          Es gibt mehr Beiträge, als hier angezeigt werden. Angezeigt werden die neuesten 300.
        </p>
      )}

      {thread.eintraege.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Fragen. Stell gern die erste.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {thread.eintraege.map((eintrag) => (
            <li key={eintrag.id} className="flex flex-col gap-2 rounded-xl border border-border p-4">
              <BeitragAnzeige
                beitrag={eintrag}
                loeschbar={darfLoeschen(eintrag)}
                loescht={loescht}
                onLoeschen={() => loeschen(eintrag)}
                antwortbar={thread.kannSchreiben && !eintrag.geloescht_am && eintrag.parent_id === null}
                onAntworten={() => {
                  setStatus("");
                  setAntwortAuf(antwortAuf === eintrag.id ? null : eintrag.id);
                }}
                antwortOffen={antwortAuf === eintrag.id}
              />
              {eintrag.antworten.length > 0 && (
                <ul className="ml-3 flex flex-col gap-3 border-l-2 border-border pl-3 sm:ml-5 sm:pl-4">
                  {eintrag.antworten.map((antwort) => (
                    <li key={antwort.id} className="flex flex-col gap-2">
                      <BeitragAnzeige
                        beitrag={antwort}
                        loeschbar={darfLoeschen(antwort)}
                        loescht={loescht}
                        onLoeschen={() => loeschen(antwort)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {antwortAuf === eintrag.id && (
                <div className="ml-3 border-l-2 border-eco-green pl-3 sm:ml-5 sm:pl-4">
                  <BeitragFormular
                    lessonId={lessonId}
                    cohortId={thread.cohortId}
                    parentId={eintrag.id}
                    label={`Antwort an ${eintrag.autor_anzeigename ?? "diesen Beitrag"}`}
                    onGesendet={gesendet}
                    onFehler={setFehler}
                    onAbbrechen={() => setAntwortAuf(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {thread.kannSchreiben && (
        <BeitragFormular
          lessonId={lessonId}
          cohortId={thread.cohortId}
          parentId={null}
          label="Neue Frage"
          onGesendet={gesendet}
          onFehler={setFehler}
        />
      )}
    </section>
  );
}

function BeitragAnzeige({
  beitrag,
  loeschbar,
  loescht,
  onLoeschen,
  antwortbar = false,
  onAntworten,
  antwortOffen = false,
}: {
  beitrag: ThreadBeitrag;
  loeschbar: boolean;
  loescht: boolean;
  onLoeschen: () => void;
  antwortbar?: boolean;
  onAntworten?: () => void;
  antwortOffen?: boolean;
}) {
  if (beitrag.geloescht_am) {
    return <p className="text-sm text-muted-foreground italic">Beitrag gelöscht</p>;
  }
  const name = beitrag.autor_anzeigename ?? "Unbekannt";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[13px] text-muted-foreground">
        <span className="font-medium text-eco-deep-green">{name}</span> ·{" "}
        <time dateTime={beitrag.created_at}>{zeitpunktInBerlin(beitrag.created_at)}</time>
      </p>
      {/* Reiner Text: React escaped, keine Links, Zeilenumbrüche bleiben. */}
      <p className="text-[15px] whitespace-pre-wrap break-words text-eco-deep-green">{beitrag.text}</p>
      {(antwortbar || loeschbar) && (
        <div className="flex flex-wrap gap-1">
          {antwortbar && (
            <button type="button" onClick={onAntworten} aria-expanded={antwortOffen} className={KLEINE_AKTION}>
              <Reply className="size-4" aria-hidden="true" /> Antworten
              <span className="sr-only"> auf den Beitrag von {name}</span>
            </button>
          )}
          {loeschbar && (
            <button type="button" onClick={onLoeschen} disabled={loescht} className={KLEINE_AKTION}>
              <Trash2 className="size-4" aria-hidden="true" /> Löschen
              <span className="sr-only"> (Beitrag von {name})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BeitragFormular({
  lessonId,
  cohortId,
  parentId,
  label,
  onGesendet,
  onFehler,
  onAbbrechen,
}: {
  lessonId: string;
  cohortId: string;
  parentId: string | null;
  label: string;
  onGesendet: () => void;
  onFehler: (fehler: string) => void;
  onAbbrechen?: () => void;
}) {
  const id = useId();
  const textfeld = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [sendet, startSenden] = useTransition();

  // Zählt wie die Datenbank (Codepoints nach NFC und Trimmen); kein maxLength,
  // weil das Browserlimit UTF-16-Einheiten zählt.
  const anzahl = zeichenAnzahl(beitragNormalisieren(text));
  const zuLang = anzahl > MAX_ZEICHEN;
  const leer = anzahl === 0;

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (leer || zuLang) return;
    startSenden(async () => {
      const ergebnis = await beitragSchreiben(lessonId, cohortId, parentId, text);
      if (!ergebnis.ok) {
        onFehler(ergebnis.fehler);
        textfeld.current?.focus();
        return;
      }
      setText("");
      onGesendet();
      textfeld.current?.focus();
    });
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">
        Bitte keine sensiblen Angaben und keine Daten anderer Personen schreiben.{" "}
        <Link href="/datenschutz" className="text-eco-deep-green underline underline-offset-2">
          Datenschutzerklärung
        </Link>
      </p>
      <label htmlFor={`${id}-text`} className="text-sm font-medium text-eco-deep-green">
        {label}
      </label>
      <textarea
        id={`${id}-text`}
        ref={textfeld}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={parentId ? 3 : 4}
        aria-describedby={`${id}-zaehler`}
        aria-invalid={zuLang || undefined}
        className="rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-eco-deep-green outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-zaehler`} className={cn("text-[13px] tabular-nums", zuLang ? "text-eco-deep-green font-semibold" : "text-muted-foreground")}>
          {anzahl} / {MAX_ZEICHEN} Zeichen{zuLang ? " – zu lang" : ""}
        </p>
        <div className="flex gap-2">
          {onAbbrechen && (
            <button type="button" onClick={onAbbrechen} disabled={sendet} className={AKTION}>
              Abbrechen
            </button>
          )}
          <button
            type="submit"
            disabled={sendet || leer || zuLang}
            className={cn(buttonVariants(), "h-11 gap-2 px-4 sm:h-9")}
          >
            <Send aria-hidden="true" />
            {sendet ? "Wird gesendet …" : parentId ? "Antwort senden" : "Frage senden"}
          </button>
        </div>
      </div>
    </form>
  );
}
