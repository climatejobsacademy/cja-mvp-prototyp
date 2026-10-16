"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Coffee, Flag, Megaphone, MessageCircle, Send, Trash2, X } from "lucide-react";

import { nachrichtLoeschen, nachrichtMelden, nachrichtSenden } from "@/app/(learner)/chat-actions";
import type { ChatKanal } from "@/lib/database.types";
import { zeitpunktKurzInBerlin } from "@/lib/date";
import { ABFRAGE_OFFEN_MS, ABFRAGE_ZU_MS, kuerzel, NACHRICHT_MAX, vorschau } from "@/lib/kohorten-chat";
import type { ChatStand } from "@/lib/queries/kohorten-chat";
import { cn } from "@/lib/utils";

// Kohorten-Chat (SR-83): schwebender Knopf unten rechts, öffnet ein
// Chat-Fenster (mobil Vollbild) mit den Kanälen "Ankündigungen" und
// "Treffpunkt". Oberfläche aus der Demo (Anna 2026-10-11), angebunden an
// Migration 0050: Nachrichten und Lesestand aus der Datenbank, neue
// Nachrichten alle 30 Sekunden bei offenem Chat, sonst alle 2 Minuten für den
// Zähler. Keine Rolle an der Nachricht (Entscheidung Anna 2026-10-16).

const KANAL_ICON = { ankuendigungen: Megaphone, treffpunkt: Coffee } as const;
const KANAL_FARBE = { ankuendigungen: "bg-brand-tint text-brand", treffpunkt: "bg-praxis-tint text-praxis-text" } as const;

function Kreis({ name, eigene }: { name: string | null; eigene: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        eigene ? "bg-lime text-ink" : "bg-subtle text-ink-muted"
      )}
    >
      {eigene ? "Du" : kuerzel(name)}
    </span>
  );
}

export function KohortenChat({ vorname }: { vorname: string }) {
  const [offen, setOffen] = useState(false);
  const [kanal, setKanal] = useState<ChatKanal | null>(null);
  const [stand, setStand] = useState<ChatStand | null>(null);
  const [entwurf, setEntwurf] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [gemeldet, setGemeldet] = useState<Set<string>>(new Set());
  const [neuLaden, setNeuLaden] = useState(0);
  const [senden, startSenden] = useTransition();
  const listeRef = useRef<HTMLDivElement>(null);
  const knopfRef = useRef<HTMLButtonElement>(null);

  const aktualisieren = useCallback(() => setNeuLaden((n) => n + 1), []);

  // Stand holen: sofort, dann regelmäßig; bei Kanalwechsel, Öffnen und nach
  // eigenen Aktionen neu. Jede Abfrage wird beim Aufräumen abgebrochen.
  useEffect(() => {
    let controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function laden() {
      const eigener = new AbortController();
      controller = eigener;
      try {
        // Offener Kanal: der Server setzt dabei den Lesestand (gelesen=1).
        const adresse = kanal && offen ? `/chat/stand?kanal=${kanal}&gelesen=1` : "/chat/stand";
        const antwort = await fetch(adresse, { signal: eigener.signal, cache: "no-store" });
        if (antwort.ok) setStand((await antwort.json()) as ChatStand);
      } catch {
        // abgebrochen oder offline: beim nächsten Durchlauf erneut
      }
      if (eigener.signal.aborted) return;
      timer = setTimeout(laden, offen ? ABFRAGE_OFFEN_MS : ABFRAGE_ZU_MS);
    }

    laden();
    const sichtbar = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        controller.abort();
        laden();
      }
    };
    document.addEventListener("visibilitychange", sichtbar);
    return () => {
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", sichtbar);
    };
  }, [offen, kanal, neuLaden]);

  // Ans Ende scrollen, wenn Nachrichten dazukommen.
  const anzahl = stand?.nachrichten?.length ?? 0;
  useEffect(() => {
    listeRef.current?.scrollTo({ top: listeRef.current.scrollHeight });
  }, [kanal, anzahl]);

  // Esc schließt das Fenster (bzw. führt aus einem Kanal zurück zur Liste).
  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (kanal) setKanal(null);
      else {
        setOffen(false);
        knopfRef.current?.focus();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen, kanal]);

  const ungelesenGesamt = stand?.kanaele.reduce((s, k) => s + k.ungelesen, 0) ?? 0;
  const aktiv = stand?.kanaele.find((k) => k.kanal === kanal) ?? null;
  const nachrichten = kanal ? (stand?.nachrichten ?? []) : [];

  function kanalWaehlen(k: ChatKanal) {
    setFehler(null);
    setStand((s) => (s ? { ...s, nachrichten: null } : s));
    setKanal(k);
  }

  function absenden() {
    const text = entwurf.trim();
    if (!kanal || !text || senden) return;
    startSenden(async () => {
      const ergebnis = await nachrichtSenden(kanal, text);
      if (ergebnis.ok) {
        setEntwurf("");
        setFehler(null);
      } else setFehler(ergebnis.fehler);
      aktualisieren();
    });
  }

  function loeschen(id: string) {
    if (!window.confirm("Diese Nachricht löschen?")) return;
    startSenden(async () => {
      const ergebnis = await nachrichtLoeschen(id);
      setFehler(ergebnis.ok ? null : ergebnis.fehler);
      aktualisieren();
    });
  }

  function melden(id: string) {
    if (!window.confirm("Diese Nachricht dem Team melden?")) return;
    startSenden(async () => {
      const ergebnis = await nachrichtMelden(id);
      if (ergebnis.ok) setGemeldet((alt) => new Set(alt).add(id));
      else setFehler(ergebnis.fehler);
    });
  }

  return (
    <>
      {!offen && (
        <button
          ref={knopfRef}
          type="button"
          onClick={() => setOffen(true)}
          aria-label={`Chat öffnen${ungelesenGesamt ? `, ${ungelesenGesamt} ungelesen` : ""}`}
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-anchor-brand outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none md:right-8 md:bottom-8"
        >
          <MessageCircle className="size-6" aria-hidden="true" />
          {ungelesenGesamt > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-lime text-xs font-bold text-ink"
            >
              {ungelesenGesamt > 99 ? "99+" : ungelesenGesamt}
            </span>
          )}
        </button>
      )}

      {offen && (
        <section
          role="dialog"
          aria-label={aktiv ? `Chat: ${aktiv.titel}` : "Chat"}
          className="fixed inset-0 z-50 flex flex-col bg-white text-ink md:inset-auto md:right-8 md:bottom-8 md:h-[min(620px,calc(100dvh-64px))] md:w-[400px] md:rounded-2xl md:border md:border-border md:shadow-[0_12px_40px_rgb(35_50_30/0.22)]"
        >
          {/* Kopf */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            {kanal ? (
              <button
                type="button"
                onClick={() => setKanal(null)}
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
              <span className="truncate text-[15px] font-bold">{aktiv ? aktiv.titel : "Chat deiner Kohorte"}</span>
              <span className="truncate text-xs text-muted-foreground">{aktiv ? aktiv.zusatz : `Hallo ${vorname}`}</span>
            </span>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setOffen(false);
                setKanal(null);
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
              {!stand ? (
                <p className="mt-8 text-center text-sm text-muted-foreground">Chat wird geladen …</p>
              ) : (
                <ul className="flex flex-col">
                  {stand.kanaele.map((k) => {
                    const Icon = KANAL_ICON[k.kanal];
                    return (
                      <li key={k.kanal}>
                        <button
                          type="button"
                          onClick={() => kanalWaehlen(k.kanal)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", KANAL_FARBE[k.kanal])}>
                            <Icon className="size-[17px]" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className={cn("truncate text-sm", k.ungelesen ? "font-bold" : "font-semibold")}>{k.titel}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {k.letzte ? vorschau(k.letzte.eigene ? "Du" : (k.letzte.name ?? "Jemand"), k.letzte.text) : "Noch keine Nachrichten"}
                            </span>
                          </span>
                          {k.ungelesen > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                              {k.ungelesen}
                              <span className="sr-only"> ungelesen</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Unterhaltung */}
          {kanal && (
            <>
              <div ref={listeRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
                {stand?.nachrichten == null ? (
                  <p className="mt-8 text-center text-sm text-muted-foreground">Nachrichten werden geladen …</p>
                ) : nachrichten.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-muted-foreground">Noch keine Nachrichten.</p>
                ) : (
                  <ul className="flex flex-col gap-3.5">
                    {nachrichten.map((n) => (
                      <li key={n.id} className={cn("group flex gap-2.5", n.eigene && "flex-row-reverse")}>
                        <Kreis name={n.name} eigene={n.eigene} />
                        <span className={cn("flex max-w-[78%] flex-col gap-1", n.eigene && "items-end")}>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-ink">{n.eigene ? "Du" : (n.name ?? "Gelöschtes Konto")}</span>
                            <span>{zeitpunktKurzInBerlin(n.zeit)}</span>
                          </span>
                          {n.text === null ? (
                            <span className="rounded-2xl bg-subtle px-3.5 py-2.5 text-sm text-muted-foreground italic">Nachricht gelöscht</span>
                          ) : (
                            <span
                              className={cn(
                                "rounded-2xl px-3.5 py-2.5 text-sm leading-snug break-words whitespace-pre-wrap",
                                n.eigene ? "rounded-tr-md bg-brand text-white" : "rounded-tl-md bg-subtle"
                              )}
                            >
                              {n.text}
                            </span>
                          )}
                          {n.text !== null && (
                            <span className="flex gap-2 text-xs text-muted-foreground opacity-70 group-focus-within:opacity-100 group-hover:opacity-100">
                              {n.eigene ? (
                                <button type="button" onClick={() => loeschen(n.id)} className="inline-flex items-center gap-1 rounded outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand">
                                  <Trash2 className="size-3.5" aria-hidden="true" /> Löschen
                                </button>
                              ) : gemeldet.has(n.id) ? (
                                <span>Gemeldet</span>
                              ) : (
                                <button type="button" onClick={() => melden(n.id)} className="inline-flex items-center gap-1 rounded outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand">
                                  <Flag className="size-3.5" aria-hidden="true" /> Melden
                                </button>
                              )}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {fehler && (
                <p role="alert" className="border-t border-border px-4 py-2 text-xs text-destructive">
                  {fehler}
                </p>
              )}

              {aktiv?.darfSchreiben ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    absenden();
                  }}
                  className="flex items-end gap-2 border-t border-border p-3"
                >
                  <label className="sr-only" htmlFor="chat-eingabe">
                    Nachricht an {aktiv.titel}
                  </label>
                  <textarea
                    id="chat-eingabe"
                    value={entwurf}
                    onChange={(e) => setEntwurf(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        absenden();
                      }
                    }}
                    rows={1}
                    maxLength={NACHRICHT_MAX}
                    placeholder={`Nachricht an ${aktiv.titel}`}
                    className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <button
                    type="submit"
                    disabled={!entwurf.trim() || senden}
                    aria-label="Senden"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-40"
                  >
                    <Send className="size-[18px]" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                aktiv && <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">Hier schreiben nur deine Trainer:innen und das Team.</p>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
