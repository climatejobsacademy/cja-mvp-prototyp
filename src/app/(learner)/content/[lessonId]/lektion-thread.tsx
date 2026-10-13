"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronDown, MessageSquareText, RefreshCw } from "lucide-react";

import { zeitpunktKurzInBerlin } from "@/lib/date";
import { MAX_ZEICHEN, beitragNormalisieren, zeichenAnzahl, type ThreadBeitrag } from "@/lib/lektion-thread";
import type { LektionThread as LektionThreadDaten } from "@/lib/queries/lektion-thread";
import { cn } from "@/lib/utils";

import { beitragLoeschen, beitragSchreiben } from "./thread-actions";

// Fragen-Thread unter einer Lektion (SR-74), Board-Darstellung wie demo
// (Entscheidung Anna 2026-10-12): Eingabe oben, jede Frage als Karte mit
// Avatar (Initialen, keine Fotos anderer Lernender), Antworten zum
// Aufklappen. Regeln wie bisher: nur Text (React escaped, Zeilenumbrüche
// bleiben), keine Echtzeit ("Aktualisieren" lädt neu), Löschen eigener
// Beiträge, Datenschutz-Hinweis an der Eingabe. Gelöschte Beiträge bleiben
// als "Beitrag gelöscht" stehen (SR-74) -- anders als demo, das sie ausblendet.
// Knöpfe werden nur ein- oder ausgeblendet, entscheiden tut das Backend.

type Eintrag = ThreadBeitrag & { antworten: ThreadBeitrag[] };

const AVATAR_FARBEN = [
  "bg-brand-tint text-brand",
  "bg-self-tint text-self",
  "bg-praxis-tint text-praxis-text",
  "bg-subtle text-ink",
];



function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  return ((teile[0]?.[0] ?? "?") + (teile.length > 1 ? teile[teile.length - 1][0] : "")).toUpperCase();
}

function Avatar({ name, klein }: { name: string; klein?: boolean }) {
  const summe = [...name].reduce((s, z) => s + z.charCodeAt(0), 0);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-bold",
        klein ? "size-7 text-[11px]" : "size-9 text-[13px]",
        AVATAR_FARBEN[summe % AVATAR_FARBEN.length]
      )}
    >
      {initialen(name)}
    </span>
  );
}

function Kopf({ beitrag, eigener }: { beitrag: ThreadBeitrag; eigener: boolean }) {
  return (
    <p className="text-[13px] text-ink-subtle">
      <span className="font-semibold text-ink">{eigener ? "Du" : (beitrag.autor_anzeigename ?? "Unbekannt")}</span>
      {" · "}
      <time dateTime={beitrag.created_at}>{zeitpunktKurzInBerlin(beitrag.created_at)}</time>
    </p>
  );
}

const TEXT_LINK =
  "rounded-sm text-[13px] font-semibold text-ink-muted outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50";

function Aktionen({
  name,
  antwortbar,
  onAntworten,
  antwortOffen,
  loeschbar,
  onLoeschen,
  loescht,
}: {
  name: string;
  antwortbar?: boolean;
  onAntworten?: () => void;
  antwortOffen?: boolean;
  loeschbar: boolean;
  onLoeschen: () => void;
  loescht: boolean;
}) {
  if (!antwortbar && !loeschbar) return null;
  return (
    <div className="flex gap-4">
      {antwortbar && (
        <button type="button" onClick={onAntworten} aria-expanded={antwortOffen} className={TEXT_LINK}>
          Antworten<span className="sr-only"> auf den Beitrag von {name}</span>
        </button>
      )}
      {loeschbar && (
        <button type="button" onClick={onLoeschen} disabled={loescht} className={TEXT_LINK}>
          Löschen<span className="sr-only"> (Beitrag von {name})</span>
        </button>
      )}
    </div>
  );
}

function DatenschutzHinweis() {
  return (
    <p className="px-1 text-xs text-ink-subtle">
      Bitte keine sensiblen Angaben und keine Daten anderer Personen.{" "}
      <Link href="/datenschutz" className="underline underline-offset-2 hover:text-ink">
        Datenschutz
      </Link>
    </p>
  );
}

/**
 * Schmale Eingabe nach Messenger-Muster: wächst mit dem Text, runder
 * Senden-Knopf, Enter sendet, Umschalt+Enter macht eine neue Zeile. Den
 * Zeichenzähler sieht man erst kurz vor der Grenze.
 */
function Eingabe({
  lessonId,
  cohortId,
  parentId,
  label,
  platzhalter,
  onGesendet,
  onFehler,
  onAbbrechen,
  autoFocus,
  mitHinweis = true,
}: {
  lessonId: string;
  cohortId: string;
  parentId: string | null;
  label: string;
  platzhalter: string;
  onGesendet: () => void;
  onFehler: (fehler: string) => void;
  onAbbrechen?: () => void;
  autoFocus?: boolean;
  mitHinweis?: boolean;
}) {
  const id = useId();
  const feld = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [sendet, startSenden] = useTransition();
  const anzahl = zeichenAnzahl(beitragNormalisieren(text));
  const zuLang = anzahl > MAX_ZEICHEN;
  const leer = anzahl === 0;

  function hoeheAnpassen() {
    const el = feld.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function absenden() {
    if (leer || zuLang || sendet) return;
    startSenden(async () => {
      const ergebnis = await beitragSchreiben(lessonId, cohortId, parentId, text);
      if (!ergebnis.ok) {
        onFehler(ergebnis.fehler);
        feld.current?.focus();
        return;
      }
      setText("");
      requestAnimationFrame(hoeheAnpassen);
      onGesendet();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        absenden();
      }}
      className="flex flex-col gap-1.5"
    >
      <label htmlFor={`${id}-text`} className="sr-only">
        {label}
      </label>
      <div className="flex items-end gap-2 rounded-[22px] border border-line bg-white py-1.5 pr-1.5 pl-4 focus-within:ring-2 focus-within:ring-brand">
        <textarea
          id={`${id}-text`}
          ref={feld}
          value={text}
          rows={1}
          autoFocus={autoFocus}
          placeholder={platzhalter}
          onChange={(e) => {
            setText(e.target.value);
            hoeheAnpassen();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              absenden();
            }
            if (e.key === "Escape" && onAbbrechen) onAbbrechen();
          }}
          aria-describedby={`${id}-zaehler`}
          aria-invalid={zuLang || undefined}
          className="min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-subtle"
        />
        <button
          type="submit"
          disabled={sendet || leer || zuLang}
          aria-label={parentId ? "Antwort senden" : "Frage senden"}
          className="flex size-9 flex-none items-center justify-center rounded-full bg-brand text-white outline-none transition-opacity hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-40"
        >
          <ArrowUp className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
      <p id={`${id}-zaehler`} className={cn("px-1 text-xs tabular-nums", zuLang ? "font-semibold text-ink" : "text-ink-subtle", anzahl < MAX_ZEICHEN - 100 && "sr-only")}>
        {anzahl} / {MAX_ZEICHEN} Zeichen{zuLang ? " – zu lang" : ""}
      </p>
      {mitHinweis && <DatenschutzHinweis />}
    </form>
  );
}

/** Logik des Threads: Aktualisieren, Löschen, Antwort-Ziel, Meldungen. */
function useThread(lessonId: string, thread: LektionThreadDaten) {
  const router = useRouter();
  const [aktualisiert, startAktualisieren] = useTransition();
  const [loescht, startLoeschen] = useTransition();
  const [antwortAuf, setAntwortAuf] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [fehler, setFehler] = useState("");

  // SR-74: gelöschte Beiträge bleiben als "Beitrag gelöscht" sichtbar, damit
  // Antworten ihren Bezug behalten (Soft-Delete).
  const sichtbar: Eintrag[] = thread.eintraege;

  return {
    sichtbar,
    antwortAuf,
    setAntwortAuf,
    status,
    fehler,
    setFehler,
    aktualisiert,
    loescht,
    eigener: (b: ThreadBeitrag) => b.person_id === thread.personId,
    darfLoeschen: (b: ThreadBeitrag) => !b.geloescht_am && (b.person_id === thread.personId || thread.istModeration),
    antwortbar: (e: Eintrag) => thread.kannSchreiben && !e.geloescht_am && e.parent_id === null,
    aktualisieren: () => {
      setFehler("");
      startAktualisieren(() => router.refresh());
    },
    loeschen: (b: ThreadBeitrag) => {
      const frage = b.person_id === thread.personId ? "Deinen Beitrag wirklich löschen?" : "Diesen Beitrag wirklich löschen?";
      if (!window.confirm(frage)) return;
      setFehler("");
      startLoeschen(async () => {
        const ergebnis = await beitragLoeschen(lessonId, b.id);
        if (!ergebnis.ok) {
          setFehler(ergebnis.fehler);
          return;
        }
        setStatus("Beitrag gelöscht.");
        router.refresh();
      });
    },
    gesendet: () => {
      setAntwortAuf(null);
      setFehler("");
      setStatus("Beitrag gesendet.");
      router.refresh();
    },
  };
}

function Rahmen({
  t,
  thread,
  anzahl,
  children,
}: {
  t: ReturnType<typeof useThread>;
  thread: LektionThreadDaten;
  anzahl: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="thread-ueberschrift" className="flex flex-col gap-5 rounded-karte bg-card p-5 shadow-card md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id="thread-ueberschrift" className="flex items-center gap-2 text-base font-bold text-ink">
          <MessageSquareText className="size-[18px] text-brand" aria-hidden="true" />
          Fragen zur Lektion
          {anzahl > 0 && <span className="text-sm font-medium text-ink-subtle tabular-nums">· {anzahl}</span>}
        </h2>
        <button
          type="button"
          onClick={t.aktualisieren}
          disabled={t.aktualisiert}
          aria-label={t.aktualisiert ? "Wird aktualisiert" : "Aktualisieren"}
          title="Aktualisieren"
          className="flex size-9 items-center justify-center rounded-full text-ink-muted outline-none hover:bg-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
        >
          <RefreshCw className={cn("size-4", t.aktualisiert && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {t.status}
      </p>
      {t.fehler && (
        <p role="alert" className="rounded-zeile border-2 border-praxis p-3 text-sm text-ink">
          {t.fehler}
        </p>
      )}
      {thread.mehrAlsLimit && (
        <p className="text-[13px] text-ink-subtle">Angezeigt werden die neuesten 300 Beiträge.</p>
      )}
      {children}
    </section>
  );
}

const LEER = <p className="text-sm text-ink-subtle">Noch keine Fragen. Stell gern die erste.</p>;
const GELOESCHT = <p className="text-sm text-ink-subtle italic">Beitrag gelöscht</p>;

function Board({ lessonId, thread }: { lessonId: string; thread: LektionThreadDaten }) {
  const t = useThread(lessonId, thread);
  const [offen, setOffen] = useState<Set<string>>(new Set());
  const umschalten = (id: string) =>
    setOffen((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  return (
    <Rahmen t={t} thread={thread} anzahl={t.sichtbar.length}>
      {thread.kannSchreiben && (
        <Eingabe
          lessonId={lessonId}
          cohortId={thread.cohortId}
          parentId={null}
          label="Neue Frage"
          platzhalter="Stell eine Frage zur Lektion …"
          onGesendet={t.gesendet}
          onFehler={t.setFehler}
        />
      )}
      {t.sichtbar.length === 0 ? (
        LEER
      ) : (
        <ul className="flex flex-col gap-3">
          {t.sichtbar.map((e) => {
            const name = e.autor_anzeigename ?? "Unbekannt";
            const aufgeklappt = offen.has(e.id) || t.antwortAuf === e.id;
            return (
              <li key={e.id} className="flex flex-col gap-3 rounded-zeile border border-line p-4">
                {e.geloescht_am ? (
                  GELOESCHT
                ) : (
                  <div className="flex items-start gap-3">
                    <Avatar name={name} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Kopf beitrag={e} eigener={t.eigener(e)} />
                      <p className="text-[15px] whitespace-pre-wrap break-words text-ink">{e.text}</p>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 pl-12">
                  {e.antworten.length > 0 && (
                    <button
                      type="button"
                      onClick={() => umschalten(e.id)}
                      aria-expanded={aufgeklappt}
                      className={cn(TEXT_LINK, "inline-flex items-center gap-1 text-brand")}
                    >
                      {e.antworten.length} {e.antworten.length === 1 ? "Antwort" : "Antworten"}
                      <ChevronDown
                        className={cn("size-4 transition-transform motion-reduce:transition-none", aufgeklappt && "rotate-180")}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                  <Aktionen
                    name={name}
                    antwortbar={t.antwortbar(e)}
                    onAntworten={() => t.setAntwortAuf(t.antwortAuf === e.id ? null : e.id)}
                    antwortOffen={t.antwortAuf === e.id}
                    loeschbar={t.darfLoeschen(e)}
                    onLoeschen={() => t.loeschen(e)}
                    loescht={t.loescht}
                  />
                </div>
                {aufgeklappt && (
                  <ul className="flex flex-col gap-3 border-t border-line pt-3 pl-12">
                    {e.antworten.map((a) =>
                      a.geloescht_am ? (
                        <li key={a.id}>{GELOESCHT}</li>
                      ) : (
                      <li key={a.id} className="flex items-start gap-2.5">
                        <Avatar name={a.autor_anzeigename ?? "Unbekannt"} klein />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <Kopf beitrag={a} eigener={t.eigener(a)} />
                          <p className="text-[15px] whitespace-pre-wrap break-words text-ink">{a.text}</p>
                          <Aktionen
                            name={a.autor_anzeigename ?? "Unbekannt"}
                            loeschbar={t.darfLoeschen(a)}
                            onLoeschen={() => t.loeschen(a)}
                            loescht={t.loescht}
                          />
                        </div>
                      </li>
                      )
                    )}
                    {t.antwortAuf === e.id && (
                      <li>
                        <Eingabe
                          lessonId={lessonId}
                          cohortId={thread.cohortId}
                          parentId={e.id}
                          label={`Antwort an ${name}`}
                          platzhalter={`Antwort an ${name} …`}
                          onGesendet={t.gesendet}
                          onFehler={t.setFehler}
                          onAbbrechen={() => t.setAntwortAuf(null)}
                          autoFocus
                          mitHinweis={false}
                        />
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Rahmen>
  );
}

export function LektionThread({ lessonId, thread }: { lessonId: string; thread: LektionThreadDaten }) {
  return <Board lessonId={lessonId} thread={thread} />;
}
