"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, BookOpen, Coffee, Megaphone, MessageCircle, Send, X } from "lucide-react";

import { datumKurz, jetztInBerlin } from "@/lib/date";
import { cn } from "@/lib/utils";

import { demoNachrichten, type ChatPerson, type Kanal } from "./chat-demo-daten";

// Haupt-Chat (VORLÄUFIG, nur Demo, Wunsch Anna 2026-10-11, SR folgt):
// schwebender Knopf unten rechts auf jeder Seite, öffnet ein Chat-Fenster
// (mobil Vollbild) mit Kanälen "Ankündigungen", je Modul und "Treffpunkt".
// Beispiel-Nachrichten aus chat-demo-daten.ts; eigene Nachrichten und
// "gelesen" bleiben im Browser (localStorage) -- keine Datenbank.

// ---------- Speicher im Browser (eigene Nachrichten, gelesen) ----------
type EigeneNachricht = { id: string; text: string; zeit: string };
type Speicher = { eigene: Record<string, EigeneNachricht[]>; gelesen: Record<string, true> };

const SCHLUESSEL = "cja-demo-chat-v1";
const LEER: Speicher = { eigene: {}, gelesen: {} };
const zuhoerer = new Set<() => void>();
let zwischenspeicher: { roh: string | null; wert: Speicher } = { roh: null, wert: LEER };

function lesen(): Speicher {
  let roh: string | null = null;
  try {
    roh = window.localStorage.getItem(SCHLUESSEL);
  } catch {
    // privater Modus o. Ä.: ohne Speicher weiter
  }
  if (roh !== zwischenspeicher.roh) {
    let wert = LEER;
    try {
      wert = roh ? { ...LEER, ...(JSON.parse(roh) as Speicher) } : LEER;
    } catch {
      wert = LEER;
    }
    zwischenspeicher = { roh, wert };
  }
  return zwischenspeicher.wert;
}

function schreiben(neu: Speicher) {
  try {
    window.localStorage.setItem(SCHLUESSEL, JSON.stringify(neu));
  } catch {
    // ohne Speicher: Änderung gilt nur bis zum Neuladen
    zwischenspeicher = { roh: JSON.stringify(neu), wert: neu };
  }
  zuhoerer.forEach((f) => f());
}

function abonnieren(f: () => void) {
  zuhoerer.add(f);
  window.addEventListener("storage", f);
  return () => {
    zuhoerer.delete(f);
    window.removeEventListener("storage", f);
  };
}

function useSpeicher(): Speicher {
  return useSyncExternalStore(abonnieren, lesen, () => LEER);
}

// ---------- Zeitangaben ----------
/** "JJJJ-MM-TTTHH:MM:SS" (Berlin) minus Minuten, als Berliner Zeitangabe. */
function minus(jetzt: string, minuten: number): string {
  return new Date(Date.parse(`${jetzt}Z`) - minuten * 60_000).toISOString().slice(0, 19);
}

function zeitText(zeit: string, jetzt: string): string {
  const uhr = zeit.slice(11, 16);
  if (zeit.slice(0, 10) === jetzt.slice(0, 10)) return uhr;
  if (zeit.slice(0, 10) === minus(jetzt, 24 * 60).slice(0, 10)) return `gestern, ${uhr}`;
  return `${datumKurz(zeit.slice(0, 10))}, ${uhr}`;
}

// ---------- Darstellung ----------
type Anzeige = { id: string; person: ChatPerson | null; text: string; zeit: string; neu: boolean };

const KANAL_ICON = { ankuendigungen: Megaphone, modul: BookOpen, treffpunkt: Coffee } as const;

function Avatar({ person }: { person: ChatPerson | null }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        person ? person.flaeche : "bg-lime text-ink"
      )}
    >
      {person ? person.kuerzel : "Du"}
    </span>
  );
}

export function DemoChat({ kanaele, vorname }: { kanaele: Kanal[]; vorname: string }) {
  const speicher = useSpeicher();
  const [offen, setOffen] = useState(false);
  const [kanalId, setKanalId] = useState<string | null>(null);
  const [entwurf, setEntwurf] = useState("");
  const [jetzt, setJetzt] = useState<string | null>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const knopfRef = useRef<HTMLButtonElement>(null);

  const nachrichtenJeKanal = useMemo(() => {
    const basis = jetzt ?? "2000-01-01T00:00:00";
    return new Map(
      kanaele.map((k) => {
        const demo: Anzeige[] = demoNachrichten(k, k.modulStatus).map((n) => ({
          id: n.id,
          person: n.person,
          text: n.text,
          zeit: minus(basis, n.vorMinuten),
          neu: !!n.neu,
        }));
        const eigene: Anzeige[] = (speicher.eigene[k.id] ?? []).map((n) => ({ ...n, person: null, neu: false }));
        return [k.id, [...demo, ...eigene].sort((a, b) => a.zeit.localeCompare(b.zeit))];
      })
    );
  }, [kanaele, speicher, jetzt]);

  const ungelesen = (k: Kanal) =>
    speicher.gelesen[k.id] ? 0 : demoNachrichten(k, k.modulStatus).filter((n) => n.neu).length;
  const ungelesenGesamt = kanaele.reduce((summe, k) => summe + ungelesen(k), 0);
  const kanal = kanaele.find((k) => k.id === kanalId) ?? null;

  function oeffnen() {
    // "jetzt" erst beim Öffnen -- so gibt es beim ersten Rendern keinen
    // Unterschied zwischen Server und Browser.
    setJetzt(jetztInBerlin());
    setOffen(true);
  }

  function kanalWaehlen(k: Kanal) {
    setKanalId(k.id);
    if (!speicher.gelesen[k.id]) schreiben({ ...speicher, gelesen: { ...speicher.gelesen, [k.id]: true } });
  }

  function senden() {
    const text = entwurf.trim();
    if (!kanal || !text) return;
    const neu: EigeneNachricht = { id: `eigene-${Date.now()}`, text, zeit: jetztInBerlin() };
    setJetzt(jetztInBerlin());
    schreiben({ ...speicher, eigene: { ...speicher.eigene, [kanal.id]: [...(speicher.eigene[kanal.id] ?? []), neu] } });
    setEntwurf("");
  }

  // Beim Öffnen eines Kanals und nach neuen Nachrichten ans Ende scrollen.
  const anzahl = kanal ? (nachrichtenJeKanal.get(kanal.id)?.length ?? 0) : 0;
  useEffect(() => {
    listeRef.current?.scrollTo({ top: listeRef.current.scrollHeight });
  }, [kanalId, anzahl]);

  // Esc schließt das Fenster (bzw. führt aus einem Kanal zurück zur Liste).
  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (kanalId) setKanalId(null);
      else {
        setOffen(false);
        knopfRef.current?.focus();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen, kanalId]);

  const nachrichten = kanal ? (nachrichtenJeKanal.get(kanal.id) ?? []) : [];
  const gruppen: { titel: string; liste: Kanal[] }[] = [
    { titel: "Team", liste: kanaele.filter((k) => k.art === "ankuendigungen") },
    { titel: "Module", liste: kanaele.filter((k) => k.art === "modul") },
    { titel: "Gemeinsam", liste: kanaele.filter((k) => k.art === "treffpunkt") },
  ].filter((g) => g.liste.length > 0);

  return (
    <>
      {!offen && (
        <button
          ref={knopfRef}
          type="button"
          onClick={oeffnen}
          aria-label={`Chat öffnen${ungelesenGesamt ? `, ${ungelesenGesamt} ungelesen` : ""}`}
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-anchor-brand outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none md:right-8 md:bottom-8"
        >
          <MessageCircle className="size-6" aria-hidden="true" />
          {ungelesenGesamt > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-lime text-xs font-bold text-ink"
            >
              {ungelesenGesamt}
            </span>
          )}
        </button>
      )}

      {offen && (
        <section
          role="dialog"
          aria-label={kanal ? `Chat: ${kanal.titel}` : "Chat"}
          className="fixed inset-0 z-50 flex flex-col bg-white text-ink md:inset-auto md:right-8 md:bottom-8 md:h-[min(620px,calc(100dvh-64px))] md:w-[400px] md:rounded-2xl md:border md:border-border md:shadow-[0_12px_40px_rgb(35_50_30/0.22)]"
        >
          {/* Kopf */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            {kanal ? (
              <button
                type="button"
                onClick={() => setKanalId(null)}
                aria-label="Zurück zu den Kanälen"
                className="flex size-9 items-center justify-center rounded-lg outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ArrowLeft className="size-[18px]" aria-hidden="true" />
              </button>
            ) : (
              <span className="flex size-9 items-center justify-center">
                <MessageCircle className="size-5" aria-hidden="true" />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-bold">{kanal ? kanal.titel : "Chat"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {kanal ? (kanal.zusatz ?? (kanal.schreibbar ? "Für alle in deiner Kohorte" : "Nur das Team schreibt hier")) : `Hallo ${vorname}`}
              </span>
            </span>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setOffen(false);
                setKanalId(null);
              }}
              aria-label="Chat schließen"
              className="flex size-9 items-center justify-center rounded-lg outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </button>
          </div>

          {/* Kanalliste */}
          {!kanal && (
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {gruppen.map((g) => (
                <div key={g.titel} className="mb-3">
                  <span className="px-3 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{g.titel}</span>
                  <ul className="mt-1 flex flex-col">
                    {g.liste.map((k) => {
                      const Icon = KANAL_ICON[k.art];
                      const liste = nachrichtenJeKanal.get(k.id) ?? [];
                      const letzte = liste.at(-1);
                      const anzahlNeu = ungelesen(k);
                      return (
                        <li key={k.id}>
                          <button
                            type="button"
                            onClick={() => kanalWaehlen(k)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                                k.art === "ankuendigungen" ? "bg-brand-tint text-brand" : k.art === "modul" ? "bg-self-tint text-progress" : "bg-praxis-tint text-praxis-text"
                              )}
                            >
                              <Icon className="size-[17px]" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-2">
                                <span className={cn("truncate text-sm", anzahlNeu ? "font-bold" : "font-semibold")}>{k.titel}</span>
                                {k.modulStatus === "aktuell" && (
                                  <span className="shrink-0 rounded-full bg-lime px-1.5 py-px text-[10px] font-bold">aktuell</span>
                                )}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {letzte ? `${letzte.person ? letzte.person.name.split(" ")[0] : "Du"}: ${letzte.text}` : "Noch keine Nachrichten"}
                              </span>
                            </span>
                            {anzahlNeu > 0 && (
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                                {anzahlNeu}
                                <span className="sr-only"> ungelesen</span>
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Unterhaltung */}
          {kanal && (
            <>
              <div ref={listeRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
                {nachrichten.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-muted-foreground">
                    Noch keine Nachrichten.
                    {kanal.modulStatus === "kommend" && <><br />Der Kanal füllt sich, wenn das Modul beginnt.</>}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3.5">
                    {nachrichten.map((n) => {
                      const eigene = n.person === null;
                      return (
                        <li key={n.id} className={cn("flex gap-2.5", eigene && "flex-row-reverse")}>
                          <Avatar person={n.person} />
                          <span className={cn("flex max-w-[78%] flex-col gap-1", eigene && "items-end")}>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-semibold text-ink">{eigene ? "Du" : n.person!.name}</span>
                              {n.person?.team && (
                                <span className="rounded-full bg-brand-tint px-1.5 py-px text-[10px] font-semibold text-ink">{n.person.team}</span>
                              )}
                              {jetzt && <span>{zeitText(n.zeit, jetzt)}</span>}
                            </span>
                            <span
                              className={cn(
                                "rounded-2xl px-3.5 py-2.5 text-sm leading-snug whitespace-pre-wrap",
                                eigene ? "rounded-tr-md bg-brand text-white" : "rounded-tl-md bg-subtle"
                              )}
                            >
                              {n.text}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {kanal.schreibbar ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    senden();
                  }}
                  className="flex items-end gap-2 border-t border-border p-3"
                >
                  <label className="sr-only" htmlFor="chat-eingabe">
                    Nachricht an {kanal.titel}
                  </label>
                  <textarea
                    id="chat-eingabe"
                    value={entwurf}
                    onChange={(e) => setEntwurf(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        senden();
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder={`Nachricht an ${kanal.titel}`}
                    className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <button
                    type="submit"
                    disabled={!entwurf.trim()}
                    aria-label="Senden"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-40"
                  >
                    <Send className="size-[18px]" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">Hier schreibt nur das Team.</p>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
