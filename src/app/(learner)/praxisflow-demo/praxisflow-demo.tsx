"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  CalendarClock,
  FileUp,
  Hammer,
  Info,
  ListOrdered,
  Package,
  Search,
  Star,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";

import { Auftragsakte } from "@/components/praxisflow/auftragsakte";
import { JetztDranFlow } from "./jetzt-dran";
import { Einschaetzung } from "@/components/praxisflow/bewertung";
import { CodewortGate } from "@/components/praxisflow/codewort-gate";
import { DemoLeiste } from "@/components/praxisflow/demo-leiste";
import { Einblenden } from "@/components/praxisflow/einblenden";
import { DateienBlock, Hinweis, InstruktionKarte } from "@/components/praxisflow/instruktion-karte";
import { ListenEditor } from "@/components/praxisflow/listen-editor";
import { PhasenAnzeige } from "@/components/praxisflow/phasen-anzeige";
import { PlanUebersicht } from "@/components/praxisflow/plan-uebersicht";
import {
  BewertungVergleich,
  EtappeGeschafft,
  FokusDurchfuehren,
} from "@/components/praxisflow/spiel-elemente";
import { FOKUS, PRIMAER, SEKUNDAER, TEXT, UEBERSCHRIFT } from "@/components/praxisflow/stile";
import {
  BEWERTUNGSBOGEN_STANDARD,
  DATEIEN,
  DATEIEN_ORDNER,
  DEMO_AUFTRAG,
  DEMO_CODEWORT,
  ETAPPEN_TEXTE,
  JA_NEIN_BESCHREIBUNGEN,
  NOTEN_BESCHREIBUNGEN,
  PHASEN,
  PHASEN_TEXTE,
  PLANEN_UNTERSCHRITTE,
  PRUEFLISTE_STANDARD,
  PUNKTE_SKALA,
  SPEICHER_PRAEFIX,
  TEXTE,
  UPLOAD_FORMATE,
  ZEIGE_CHECKLISTE,
  ZEIGE_INSTRUKTION,
  type PhaseId,
} from "@/lib/praxisflow-daten";
import {
  alleErledigt,
  allesGeprueft,
  bogenVollstaendig,
  codewortKorrekt,
  demoZuruecksetzen,
  eintragBearbeiten,
  eintragLoeschen,
  eintraegeAnhaengen,
  eintragVerschieben,
  erledigtBereinigen,
  schrittStatus,
  schrittUmschalten,
  nacharbeitNoetig,
  planBereit,
  planenWeiter,
  planenWeiterMoeglich,
  planenZurueck,
  pruefungUmschalten,
  mitVerlauf,
  nachFrist,
  startZustand,
  zurNacharbeit,
  zustandLaden,
  zustandSpeichern,
  type DemoZustand,
  type Eintrag,
} from "@/lib/praxisflow-logik";
import { Avatar } from "@/components/avatar";
import { TRAINER_PRAXIS_DEMO } from "@/lib/demo-personen";
import { jetztInBerlin } from "@/lib/date";
import { cn } from "@/lib/utils";

// Verlauf der Auftragsakte (Anna 2026-10-20): feste Texte, damit die Akte
// Freigabe und Abgabe darin wiederfindet.
export const VERLAUF = {
  angenommen: "Auftrag angenommen",
  entschieden: "Planung vollständig, Ausführung begonnen",
  aufbauFertig: "Aufbau fertig, Kontrolle begonnen",
  freigabe: "Inbetriebnahme freigegeben (Codewort der Trainer:in)",
  nacharbeit: "Zur Nacharbeit zurückgegeben",
  abgeschlossen: "Auftrag abgeschlossen",
};

/** Zustand ändern und im Verlauf festhalten (Berliner Zeit). */
export const protokolliert = (text: string) => (z: DemoZustand) => mitVerlauf(z, jetztInBerlin(), text);

export function speicher(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function neueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export const pruefen = (eingabe: string) => codewortKorrekt(eingabe, DEMO_CODEWORT);
const nichts = () => () => {};

type Zurueck = { href: string; label: string };

/**
 * Rendert den Flow erst im Browser: der Stand liegt im localStorage, der
 * Server kennt ihn nicht. So gibt es keinen Hydration-Unterschied.
 */
export function PraxisflowDemo({
  zurueck,
  unterSpannung = true,
  ansicht = "alt",
}: {
  zurueck: Zurueck;
  unterSpannung?: boolean;
  /** "neu": Ansicht "Jetzt dran" (Anna 2026-10-20), ?ansicht=neu */
  ansicht?: "alt" | "neu";
}) {
  const imBrowser = useSyncExternalStore(
    nichts,
    () => true,
    () => false
  );

  return (
    // Kopf wie die Lektionsseite (Angleichung Anna 2026-10-12): Zurück-Link,
    // klein "Praxisaufgabe", groß der Auftrag.
    <div className="flex flex-col gap-5">
      <Link
        href={zurueck.href}
        className={cn("flex w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink", FOKUS)}
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Zurück zum {zurueck.label}
      </Link>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Praxisaufgabe</span>
        <h1 className="font-heading text-[28px] leading-tight text-ink md:text-[36px]">{DEMO_AUFTRAG.titel}</h1>
        {/* Wer begleitet die Aufgabe (Anna 2026-10-12, Demo: Trainer fest im Code). */}
        <span className="inline-flex items-center gap-2 text-[15px] text-ink-muted">
          <Avatar name={TRAINER_PRAXIS_DEMO.name} foto={TRAINER_PRAXIS_DEMO.foto} groesse="sm" />
          mit {TRAINER_PRAXIS_DEMO.name}
        </span>
      </div>
      {imBrowser ? (
        ansicht === "neu" ? (
          <JetztDranFlow unterSpannung={unterSpannung} />
        ) : (
          <Flow unterSpannung={unterSpannung} />
        )
      ) : (
        <p className="text-sm text-ink-muted">Demo wird geladen …</p>
      )}
    </div>
  );
}

export type Liste = "werkzeuge" | "materialien" | "schritte";

const PHASEN_SYMBOL: Record<PhaseId, typeof Wrench> = {
  analyse: Search,
  planen: ListOrdered,
  entscheiden: UserCheck,
  durchfuehren: Hammer,
  kontrolle: ClipboardCheck,
  bewerten: Star,
};

export const EDITOR: Record<Liste, { icon: typeof Wrench; einzahl: string; leerText: string; platzhalter: string }> = {
  werkzeuge: {
    icon: Wrench,
    einzahl: "Werkzeug",
    leerText: "Noch keine Werkzeuge eingetragen.",
    platzhalter: "Werkzeug eintragen …",
  },
  materialien: {
    icon: Package,
    einzahl: "Material",
    leerText: "Noch keine Materialien eingetragen.",
    platzhalter: "Material eintragen …",
  },
  schritte: {
    icon: ListOrdered,
    einzahl: "Schritt",
    leerText: "Noch keine Arbeitsschritte eingetragen.",
    platzhalter: "Arbeitsschritt eintragen …",
  },
};

function Flow({ unterSpannung }: { unterSpannung: boolean }) {
  const [zustand, setZustand] = useState<DemoZustand>(() => zustandLaden(speicher(), SPEICHER_PRAEFIX));
  // Erhöht sich beim Zurücksetzen, damit Eingabefelder und Foto neu starten.
  const [durchlauf, setDurchlauf] = useState(0);

  useEffect(() => {
    zustandSpeichern(speicher(), SPEICHER_PRAEFIX, zustand);
  }, [zustand]);

  // Spielerisch (Vorschau Anna 2026-10-12): zwischen zwei Phasen erst
  // "Etappe geschafft!" -- nur auf der Seite, nicht im gespeicherten Stand.
  const [etappe, setEtappe] = useState<{ von: PhaseId; nach: PhaseId } | null>(null);

  const aktuell = PHASEN.findIndex((p) => p.id === zustand.phase);
  const texte = PHASEN_TEXTE[zustand.phase];
  const phasenName = (id: PhaseId) => PHASEN.find((p) => p.id === id)?.name ?? "";

  /** Vorwärts in die nächste Phase: zuerst der "Etappe geschafft"-Moment. */
  function geschafft(nach: PhaseId) {
    setEtappe({ von: zustand.phase, nach });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function zuPhase(phase: PhaseId) {
    setZustand((z) => ({ ...z, phase, erledigt: erledigtBereinigen(z.erledigt, z.schritte) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Planen: Unterschritt wechseln (bzw. Phase am Anfang und Ende der Abfolge).
  function planenGehen(richtung: "weiter" | "zurueck", ohneEtappe = false) {
    // Nach dem letzten Unterschritt geht es zu Entscheiden -- erst feiern.
    if (
      !ohneEtappe &&
      richtung === "weiter" &&
      planenWeiter(zustand, PLANEN_UNTERSCHRITTE.length).phase === "entscheiden"
    ) {
      geschafft("entscheiden");
      return;
    }
    setZustand((z) => {
      const ziel = richtung === "weiter" ? planenWeiter(z, PLANEN_UNTERSCHRITTE.length) : planenZurueck(z);
      return { ...z, ...ziel, erledigt: erledigtBereinigen(z.erledigt, z.schritte) };
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function liste(name: Liste, aendern: (l: Eintrag[]) => Eintrag[]) {
    setZustand((z) => {
      const neu = aendern(z[name]);
      return name === "schritte"
        ? { ...z, schritte: neu, erledigt: erledigtBereinigen(z.erledigt, neu) }
        : { ...z, [name]: neu };
    });
  }

  function editorProps(name: Liste) {
    return {
      eintraege: zustand[name],
      // Neue Einträge (getippte Zeilen oder diktierte Sätze) unten anhängen;
      // bei Arbeitsschritten danach wie bisher sortierbar.
      onHinzufuegen: (texte: string[]) => liste(name, (l) => eintraegeAnhaengen(l, texte, neueId)),
      onBearbeiten: (id: string, text: string) => liste(name, (l) => eintragBearbeiten(l, id, text)),
      onLoeschen: (id: string) => liste(name, (l) => eintragLoeschen(l, id)),
      eingabeTexte: TEXTE.eingabe,
    };
  }

  function zuruecksetzen() {
    demoZuruecksetzen(speicher(), SPEICHER_PRAEFIX);
    setZustand(startZustand());
    setDurchlauf((d) => d + 1);
    setEtappe(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Instruktion und "Hast du alles?" per Schalter (praxisflow-daten.ts).
  const karte = {
    instruktion: ZEIGE_INSTRUKTION ? texte.instruktion : undefined,
    hastDuAlles: ZEIGE_CHECKLISTE ? texte.hastDuAlles : [],
    hastDuAllesTitel: TEXTE.hastDuAllesTitel,
    fortschritt: <PhasenAnzeige phasen={PHASEN} aktuell={aktuell} />,
  };

  return (
    <>
      <div
        key={`${durchlauf}-${zustand.phase}-${zustand.planenSchritt}-${etappe?.nach ?? ""}`}
        className="flex flex-col gap-6"
      >
        {etappe && (
          <InstruktionKarte
            icon={PHASEN_SYMBOL[etappe.nach]}
            titel={phasenName(etappe.nach)}
            {...karte}
            instruktion={undefined}
            hastDuAlles={[]}
            fortschritt={<PhasenAnzeige phasen={PHASEN} aktuell={PHASEN.findIndex((p) => p.id === etappe.nach)} />}
          >
            <EtappeGeschafft
              titel={ETAPPEN_TEXTE[etappe.von].titel}
              text={ETAPPEN_TEXTE[etappe.von].text}
              naechste={phasenName(etappe.nach)}
              onWeiter={() => {
                const { von, nach } = etappe;
                setEtappe(null);
                if (von === "planen") planenGehen("weiter", true);
                else zuPhase(nach);
              }}
            />
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "analyse" && (
          <InstruktionKarte icon={Search} titel={phasenName("analyse")} {...karte}>
            <AnalyseSchritte
              auftragDateien={zustand.auftragDateien}
              onAuftragDateien={(d) => setZustand((z) => ({ ...z, auftragDateien: d }))}
              onAngenommen={() => setZustand(protokolliert(VERLAUF.angenommen))}
              onWeiter={() => geschafft("planen")}
            />
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "planen" && (
          <PlanenAbfolge
            karte={karte}
            nr={zustand.planenSchritt}
            schritte={zustand.schritte}
            editor={(name) => (
              <ListenEditor
                id={name}
                titel={PLANEN_UNTERSCHRITTE.find((u) => u.id === name)!.titel}
                {...EDITOR[name]}
                {...editorProps(name)}
                onVerschieben={
                  name === "schritte"
                    ? (id, richtung) => liste("schritte", (l) => eintragVerschieben(l, id, richtung))
                    : undefined
                }
              />
            )}
            plaene={
              <div className="flex flex-col gap-2">
                <h3 className={UEBERSCHRIFT}>{TEXTE.planen.plaeneTitel}</h3>
                <p className={TEXT}>{TEXTE.planen.plaeneText}</p>
                <DateienListe
                  id="plaene"
                  accept={UPLOAD_FORMATE.plaene}
                  dateien={zustand.planDateien}
                  onDateien={(d) => setZustand((z) => ({ ...z, planDateien: d }))}
                />
              </div>
            }
            onWeiter={() => planenGehen("weiter")}
            onZurueck={() => planenGehen("zurueck")}
          />
        )}

        {!etappe && zustand.phase === "entscheiden" && (
          <InstruktionKarte icon={UserCheck} titel={phasenName("entscheiden")} {...karte}>
            <PlanUebersicht
              werkzeuge={zustand.werkzeuge}
              materialien={zustand.materialien}
              schritte={zustand.schritte}
            />
            {zustand.planDateien.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className={UEBERSCHRIFT}>Pläne und Zeichnungen</h3>
                <DateienListe id="plaene-uebersicht" accept="" dateien={zustand.planDateien} />
              </div>
            )}
            {/* Kein Trainer-Gate: die Lernenden entscheiden selbst (Partner-Feedback 15.10., Anna 2026-10-20). */}
            <EntscheidenBestaetigen
              onWeiter={() => {
                setZustand(protokolliert(VERLAUF.entschieden));
                geschafft("durchfuehren");
              }}
              onZurueck={() => zuPhase("planen")}
            />
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "durchfuehren" && (
          <InstruktionKarte icon={Hammer} titel={phasenName("durchfuehren")} {...karte}>
            {/* Fokus-Modus (Vorschau 2026-10-12): immer ein Schritt groß. Die
                bisherige Checkliste liegt in schritte-checkliste.tsx. */}
            <FokusDurchfuehren
              schritte={zustand.schritte}
              erledigt={zustand.erledigt}
              status={Object.fromEntries(
                zustand.schritte.map((s) => [s.id, schrittStatus(zustand.schritte, zustand.erledigt, s.id)])
              )}
              onUmschalten={(id) =>
                setZustand((z) => ({ ...z, erledigt: schrittUmschalten(z.schritte, z.erledigt, id) }))
              }
            />
            {alleErledigt(zustand.schritte, zustand.erledigt) && (
              <Einblenden>
                <button
                  type="button"
                  onClick={() => {
                    setZustand(protokolliert(VERLAUF.aufbauFertig));
                    geschafft("kontrolle");
                  }}
                  className={cn(PRIMAER, "sm:self-start")}
                >
                  {TEXTE.ausfuehren.fertig}
                  <ArrowRight aria-hidden="true" />
                </button>
              </Einblenden>
            )}
            <button type="button" onClick={() => zuPhase("planen")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Planen
            </button>
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "kontrolle" && (
          <InstruktionKarte icon={ClipboardCheck} titel={phasenName("kontrolle")} {...karte}>
            <KontrollierenSchritte
              zustand={zustand}
              setZustand={setZustand}
              unterSpannung={unterSpannung}
              onWeiter={() => geschafft("bewerten")}
            />
            <button type="button" onClick={() => zuPhase("durchfuehren")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu {phasenName("durchfuehren")}
            </button>
          </InstruktionKarte>
        )}

        {/* Nach dem Abschluss nur die Auftragsakte, ohne "Aufgabe geschafft" (Anna 2026-10-20). */}
        {!etappe && zustand.phase === "bewerten" && zustand.bewertungAbgeschlossen && (
          <AkteAusZustand zustand={zustand} unterSpannung={unterSpannung} />
        )}

        {!etappe && zustand.phase === "bewerten" && !zustand.bewertungAbgeschlossen && (
          <InstruktionKarte icon={Star} titel={phasenName("bewerten")} {...karte}>
            <BewertenSchritte zustand={zustand} setZustand={setZustand} />
          </InstruktionKarte>
        )}
      </div>
      <DemoLeiste onZuruecksetzen={zuruecksetzen} />
    </>
  );
}

/** Erledigter Schritt als eine Zeile mit Häkchen (optional "Ändern"). */
function ErledigtZeile({ text, onAendern }: { text: string; onAendern?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-zeile bg-subtle px-4 py-3">
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{text}</span>
      {onAendern && (
        <button type="button" onClick={onAendern} className={cn("rounded-sm text-[13px] font-semibold text-ink-muted hover:text-ink", FOKUS)}>
          Ändern
        </button>
      )}
    </div>
  );
}

// Bogen mit den Stufentexten je Skala (Ja/Nein oder gestuft).
export const BOGEN = BEWERTUNGSBOGEN_STANDARD.map((k) => ({
  ...k,
  beschreibungen: k.skala.length === 2 ? JA_NEIN_BESCHREIBUNGEN : NOTEN_BESCHREIBUNGEN,
}));

/**
 * Bewerten eins nach dem anderen (Anna 2026-10-20): eigene Einschätzung →
 * Mitlernende:r am selben Gerät → Trainer:in nach Codewort → Vergleich der
 * drei. Gibt die Trainer:in bei einem K.-o.-Kriterium 0 Punkte, geht der
 * Auftrag zur Nacharbeit zurück, sonst wird er abgeschlossen.
 */
function BewertenSchritte({
  zustand,
  setZustand,
}: {
  zustand: DemoZustand;
  setZustand: React.Dispatch<React.SetStateAction<DemoZustand>>;
}) {
  const t = TEXTE.bewerten;
  const selbstKomplett = bogenVollstaendig(BOGEN, zustand.selbst);
  const peerKomplett = bogenVollstaendig(BOGEN, zustand.peer);
  const fremdKomplett = bogenVollstaendig(BOGEN, zustand.fremd);
  const [schritt, setSchritt] = useState<"selbst" | "peer" | "trainer" | "vergleich">(() =>
    zustand.fremdFreigegeben ? (fremdKomplett ? "vergleich" : "trainer") : "selbst"
  );

  const bogen = (id: "selbst" | "peer" | "fremd", titel: string, text: string, gesperrt = false) => (
    <Einschaetzung
      id={id}
      titel={titel}
      text={text}
      kriterien={BOGEN}
      skala={PUNKTE_SKALA}
      beschreibungen={NOTEN_BESCHREIBUNGEN}
      werte={zustand[id]}
      onWert={(k, p) => setZustand((z) => ({ ...z, [id]: { ...z[id], [k]: p } }))}
      gesperrt={gesperrt}
    />
  );

  const erledigt = (
    <>
      {schritt !== "selbst" && (
        <ErledigtZeile text={t.selbstTitel} onAendern={zustand.fremdFreigegeben ? undefined : () => setSchritt("selbst")} />
      )}
      {(schritt === "trainer" || schritt === "vergleich") && (
        <ErledigtZeile text={t.peerTitel} onAendern={zustand.fremdFreigegeben ? undefined : () => setSchritt("peer")} />
      )}
      {schritt === "vergleich" && <ErledigtZeile text={t.fremdTitel} onAendern={() => setSchritt("trainer")} />}
    </>
  );

  if (schritt === "selbst") {
    return (
      <>
        {bogen("selbst", t.selbstTitel, t.selbstText, zustand.fremdFreigegeben)}
        {selbstKomplett ? (
          <Einblenden>
            <button type="button" onClick={() => setSchritt("peer")} className={cn(PRIMAER, "sm:self-start")}>
              Weiter <ArrowRight aria-hidden="true" />
            </button>
          </Einblenden>
        ) : (
          <p className="text-[13px] text-ink-muted">Wähle für jedes Kriterium die Punkte, dann geht es weiter.</p>
        )}
      </>
    );
  }

  if (schritt === "peer") {
    return (
      <>
        {erledigt}
        <Einblenden>
          {bogen("peer", t.peerTitel, t.peerText, zustand.fremdFreigegeben)}
          {peerKomplett && (
            <button type="button" onClick={() => setSchritt("trainer")} className={cn(PRIMAER, "sm:self-start")}>
              {t.peerWeiter} <ArrowRight aria-hidden="true" />
            </button>
          )}
        </Einblenden>
      </>
    );
  }

  if (schritt === "trainer") {
    return (
      <>
        {erledigt}
        <Einblenden>
          {!zustand.fremdFreigegeben ? (
            <CodewortGate
              id="gate-bewerten"
              hinweis={TEXTE.gates.bewerten}
              label={TEXTE.codewort.label}
              buttonText="Einschätzung der Trainer:in öffnen"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => setZustand((z) => ({ ...z, fremdFreigegeben: true }))}
            />
          ) : (
            <>
              {bogen("fremd", t.fremdTitel, t.fremdText, zustand.bewertungAbgeschlossen)}
              {fremdKomplett && (
                <button type="button" onClick={() => setSchritt("vergleich")} className={cn(PRIMAER, "sm:self-start")}>
                  Weiter zum Vergleich <ArrowRight aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </Einblenden>
      </>
    );
  }

  const nacharbeit = nacharbeitNoetig(BOGEN, zustand.fremd);
  return (
    <>
      {erledigt}
      <BewertungVergleich
        kriterien={BOGEN}
        spalten={[
          { name: "Du", werte: zustand.selbst },
          { name: "Peer", werte: zustand.peer },
          { name: "Trainer:in", werte: zustand.fremd },
        ]}
      />
      <Einblenden>
        {nacharbeit ? (
          <div className="flex flex-col gap-3">
            <Hinweis icon={Info}>
              <strong className="block">{t.nacharbeitTitel}</strong>
              {t.nacharbeitText}
            </Hinweis>
            <button
              type="button"
              onClick={() => {
                setZustand((z) => protokolliert(VERLAUF.nacharbeit)(zurNacharbeit(z)));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(PRIMAER, "sm:self-start")}
            >
              {t.nacharbeitButton} <ArrowLeft aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setZustand((z) => protokolliert(VERLAUF.abgeschlossen)({ ...z, bewertungAbgeschlossen: true }))}
            disabled={!(selbstKomplett && peerKomplett && fremdKomplett)}
            className={cn(PRIMAER, "sm:self-start")}
          >
            Bewertung abschließen <Check aria-hidden="true" />
          </button>
        )}
      </Einblenden>
    </>
  );
}

/**
 * Analyse Schritt für Schritt (Anna 2026-10-12): Phasen-Übersicht bleibt
 * oben, darunter erscheint der nächste Schritt erst, wenn der vorige erledigt
 * ist -- Arbeitsauftrag lesen → Unterlagen ansehen → Weiter zu Planen. Der
 * Stand gilt nur, solange die Phase offen ist.
 */
function AnalyseSchritte({
  auftragDateien,
  onAuftragDateien,
  onAngenommen,
  onWeiter,
}: {
  auftragDateien: string[];
  onAuftragDateien: (dateien: string[]) => void;
  onAngenommen: () => void;
  onWeiter: () => void;
}) {
  const [angenommen, setAngenommen] = useState(auftragDateien.length > 0);
  const [gelesen, setGelesen] = useState(false);
  const [angesehen, setAngesehen] = useState<Set<string>>(new Set());
  const alleAngesehen = DATEIEN.every((d) => angesehen.has(d.dateiname));
  const t = TEXTE.analyse;

  // Zuerst: Auftrag erhalten (Papier, unterschrieben) und hochladen (Plan Anna 2026-10-20).
  if (!angenommen) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className={UEBERSCHRIFT}>{t.auftragTitel}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px] text-ink">
          <dt className="text-ink-muted">{t.ausgabe}</dt>
          <dd>{DEMO_AUFTRAG.ausgabe}</dd>
          <dt className="inline-flex items-center gap-1.5 text-ink-muted">
            <CalendarClock className="size-4" aria-hidden="true" />
            {t.frist}
          </dt>
          <dd className="font-semibold">{DEMO_AUFTRAG.frist}</dd>
        </dl>
        <p className={TEXT}>{t.auftragText}</p>
        <DateienListe id="auftrag" accept={UPLOAD_FORMATE.auftrag} dateien={auftragDateien} onDateien={onAuftragDateien} />
        {auftragDateien.length > 0 && (
          <Einblenden>
            <button
              type="button"
              onClick={() => {
                setAngenommen(true);
                onAngenommen();
              }}
              className={cn(PRIMAER, "sm:self-start")}
            >
              {t.auftragWeiter} <Check aria-hidden="true" />
            </button>
          </Einblenden>
        )}
      </div>
    );
  }

  return (
    <>
      <ErledigtZeile text={`${t.auftragTitel} · Abgabe bis ${DEMO_AUFTRAG.frist}`} onAendern={() => setAngenommen(false)} />
      <div className="flex flex-col gap-3">
        <h3 className={UEBERSCHRIFT}>Arbeitsauftrag</h3>
        {/* Ohne Fachbegriffe zum Antippen: der Vokabelklick kommt erst nach dem Start (Anna 2026-10-20). */}
        <p className={TEXT}>{TEXTE.analyse.arbeitsauftrag}</p>
        {gelesen ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <Check className="size-4 text-brand" strokeWidth={3} aria-hidden="true" /> Gelesen
          </p>
        ) : (
          <button type="button" onClick={() => setGelesen(true)} className={cn(PRIMAER, "sm:self-start")}>
            Gelesen <Check aria-hidden="true" />
          </button>
        )}
      </div>
      {gelesen && (
        <Einblenden>
          <DateienBlock
            titel="Unterlagen ansehen"
            ordner={DATEIEN_ORDNER}
            dateien={DATEIEN}
            angesehen={angesehen}
            onOeffnen={(name) => setAngesehen((alt) => new Set(alt).add(name))}
          />
          {!alleAngesehen && <p className="text-[13px] text-ink-muted">Öffne alle Unterlagen, dann geht es weiter.</p>}
        </Einblenden>
      )}
      {gelesen && alleAngesehen && (
        <Einblenden>
          <button type="button" onClick={onWeiter} className={cn(PRIMAER, "sm:self-start")}>
            Weiter zu Planen
            <ArrowRight aria-hidden="true" />
          </button>
        </Einblenden>
      )}
    </>
  );
}

type Karte = {
  instruktion?: string;
  hastDuAlles: string[];
  hastDuAllesTitel: string;
  fortschritt?: React.ReactNode;
};

/**
 * Planen in drei Unterschritten nacheinander (Werkzeuge, Materialien,
 * Arbeitsschritte): je Unterschritt nur ein Editor, "Zurück" und "Weiter".
 * Nach dem letzten Unterschritt geht es zu Entscheiden.
 */
function PlanenAbfolge({
  karte,
  nr,
  schritte,
  editor,
  plaene,
  onWeiter,
  onZurueck,
}: {
  karte: Karte;
  nr: number;
  schritte: Eintrag[];
  editor: (name: Liste) => React.ReactNode;
  /** Upload der Pläne, nur im letzten Unterschritt (Arbeitsschritte). */
  plaene?: React.ReactNode;
  onWeiter: () => void;
  onZurueck: () => void;
}) {
  const gesamt = PLANEN_UNTERSCHRITTE.length;
  const unterschritt = PLANEN_UNTERSCHRITTE[nr] ?? PLANEN_UNTERSCHRITTE[0];
  const letzter = nr === gesamt - 1;
  const weiterMoeglich = planenWeiterMoeglich(nr, schritte, gesamt);
  return (
    <InstruktionKarte icon={ListOrdered} titel="Planen" {...karte}>
      <p className="text-sm font-semibold text-ink-muted" aria-live="polite">
        {TEXTE.planen.unterschritt(nr + 1, gesamt)}: {unterschritt.titel}
      </p>
      {editor(unterschritt.id)}
      {letzter && plaene}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onZurueck} className={SEKUNDAER}>
            <ArrowLeft aria-hidden="true" />
            Zurück
          </button>
          <button
            type="button"
            onClick={onWeiter}
            disabled={!weiterMoeglich}
            aria-describedby={weiterMoeglich ? undefined : "planen-gesperrt"}
            className={PRIMAER}
          >
            Weiter
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        {letzter && !planBereit(schritte) && (
          <p id="planen-gesperrt" className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            {TEXTE.planen.gesperrt}
          </p>
        )}
      </div>
    </InstruktionKarte>
  );
}

/** Entscheiden: die Lernenden bestätigen selbst, dass ihr Plan vollständig ist. */
function EntscheidenBestaetigen({ onWeiter, onZurueck }: { onWeiter: () => void; onZurueck: () => void }) {
  const [sicher, setSicher] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-start gap-3 rounded-zeile bg-subtle px-4 py-3 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={sicher}
          onChange={(e) => setSicher(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-brand"
        />
        <span>{TEXTE.entscheiden.bestaetigen}</span>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button type="button" onClick={onZurueck} className={SEKUNDAER}>
          <ArrowLeft aria-hidden="true" />
          Plan ändern
        </button>
        <button type="button" onClick={onWeiter} disabled={!sicher} className={PRIMAER}>
          {TEXTE.entscheiden.button}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Eine Prüfung zum Abhaken. */
function PruefZeile({ titel, an, onUmschalten }: { titel: string; an: boolean; onUmschalten: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-zeile bg-subtle px-4 py-3 text-[15px] text-ink">
      <input type="checkbox" checked={an} onChange={onUmschalten} className="size-5 shrink-0 accent-brand" />
      <span className={an ? "font-semibold" : undefined}>{titel}</span>
    </label>
  );
}

/**
 * Kontrollieren in drei Teilen (Partner-Feedback 15.10., Anna 2026-10-20):
 * A Prüfen ohne Spannung (allein) → B Freigabe zur Inbetriebnahme durch die
 * Trainer:in (Codewort) → C Prüfen unter Spannung und Prüfprotokoll (PDF).
 */
function KontrollierenSchritte({
  zustand,
  setZustand,
  unterSpannung,
  onWeiter,
}: {
  zustand: DemoZustand;
  setZustand: React.Dispatch<React.SetStateAction<DemoZustand>>;
  /** Ohne Spannung (je Auftrag): keine Freigabe, keine Prüfungen unter Spannung. */
  unterSpannung: boolean;
  onWeiter: () => void;
}) {
  const liste = PRUEFLISTE_STANDARD;
  const aFertig = allesGeprueft(liste.spannungsfrei, zustand.geprueftSpannungsfrei);
  const cFertig = allesGeprueft(liste.unterSpannung, zustand.geprueftUnterSpannung);
  const t = TEXTE.kontrolle;

  const protokoll = (
    <div className="flex flex-col gap-2">
      <h3 className={UEBERSCHRIFT}>{t.protokollTitel}</h3>
      <p className={TEXT}>{t.protokollText}</p>
      <DateienListe
        id="pruefprotokoll"
        accept={UPLOAD_FORMATE.protokoll}
        dateien={zustand.protokollDateien}
        onDateien={(d) => setZustand((z) => ({ ...z, protokollDateien: d }))}
      />
    </div>
  );

  // Auftrag ohne Spannung: nur Prüfen ohne Spannung und Protokoll, kein Gate.
  if (!unterSpannung) {
    return (
      <>
        <Hinweis icon={Info}>{t.ohneSpannungHinweis}</Hinweis>
        <div className="flex flex-col gap-2">
          <h3 className={UEBERSCHRIFT}>{t.spannungsfreiTitel}</h3>
          <p className={TEXT}>{t.spannungsfreiText}</p>
          {liste.spannungsfrei.map((p) => (
            <PruefZeile
              key={p.id}
              titel={p.titel}
              an={zustand.geprueftSpannungsfrei.includes(p.id)}
              onUmschalten={() =>
                setZustand((z) => ({ ...z, geprueftSpannungsfrei: pruefungUmschalten(z.geprueftSpannungsfrei, p.id) }))
              }
            />
          ))}
        </div>
        {aFertig && <Einblenden>{protokoll}</Einblenden>}
        {aFertig && zustand.protokollDateien.length > 0 && (
          <button type="button" onClick={onWeiter} className={cn(PRIMAER, "sm:self-start")}>
            {t.weiter}
            <ArrowRight aria-hidden="true" />
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3 className={UEBERSCHRIFT}>{t.spannungsfreiTitel}</h3>
        <p className={TEXT}>{t.spannungsfreiText}</p>
        {liste.spannungsfrei.map((p) => (
          <PruefZeile
            key={p.id}
            titel={p.titel}
            an={zustand.geprueftSpannungsfrei.includes(p.id)}
            onUmschalten={() =>
              !zustand.inbetriebnahmeFreigegeben &&
              setZustand((z) => ({ ...z, geprueftSpannungsfrei: pruefungUmschalten(z.geprueftSpannungsfrei, p.id) }))
            }
          />
        ))}
      </div>

      {!zustand.inbetriebnahmeFreigegeben && (
        <div className="flex flex-col gap-2">
          <h3 className={UEBERSCHRIFT}>{t.freigabeTitel}</h3>
          <Hinweis icon={UserCheck}>{t.freigabeText}</Hinweis>
          <CodewortGate
            id="gate-kontrolle"
            hinweis={TEXTE.gates.kontrolle}
            label={TEXTE.codewort.label}
            buttonText="Inbetriebnahme freigeben"
            aktiv={aFertig}
            gesperrtText={t.freigabeGesperrt}
            fehlerText={TEXTE.codewort.falsch}
            pruefen={pruefen}
            onFreigabe={() => setZustand((z) => protokolliert(VERLAUF.freigabe)({ ...z, inbetriebnahmeFreigegeben: true }))}
          />
        </div>
      )}

      {zustand.inbetriebnahmeFreigegeben && (
        <Einblenden>
          <ErledigtZeile text={`${t.freigabeTitel}: erteilt`} />
          <div className="flex flex-col gap-2">
            <h3 className={UEBERSCHRIFT}>{t.unterSpannungTitel}</h3>
            <p className={TEXT}>{t.unterSpannungText}</p>
            {liste.unterSpannung.map((p) => (
              <PruefZeile
                key={p.id}
                titel={p.titel}
                an={zustand.geprueftUnterSpannung.includes(p.id)}
                onUmschalten={() =>
                  setZustand((z) => ({ ...z, geprueftUnterSpannung: pruefungUmschalten(z.geprueftUnterSpannung, p.id) }))
                }
              />
            ))}
          </div>
          {protokoll}
          {cFertig && zustand.protokollDateien.length > 0 && (
            <button type="button" onClick={onWeiter} className={cn(PRIMAER, "sm:self-start")}>
              {t.weiter}
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </Einblenden>
      )}
    </>
  );
}

/**
 * Dateien hochladen (Demo: nur die Dateinamen werden im Browser gemerkt,
 * nichts wird übertragen). Mehrere Dateien, jede wieder entfernbar. Ohne
 * `onDateien` nur die Liste zum Ansehen.
 */
export function DateienListe({
  id,
  accept,
  dateien,
  onDateien,
}: {
  id: string;
  accept: string;
  dateien: string[];
  onDateien?: (dateien: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {dateien.length > 0 && (
        <ul className="flex flex-col gap-2">
          {dateien.map((name, i) => (
            <li key={`${name}-${i}`} className="flex items-center gap-3 rounded-zeile bg-subtle px-4 py-2.5 text-[15px] text-ink">
              <Check className="size-4 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {onDateien && (
                <button
                  type="button"
                  onClick={() => onDateien(dateien.filter((_, j) => j !== i))}
                  aria-label={`${name} entfernen`}
                  className={cn("rounded-sm text-ink-muted hover:text-ink", FOKUS)}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {onDateien && (
        <label
          htmlFor={id}
          className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-subtle px-5 text-[15px] font-semibold text-ink hover:bg-praxis-tint has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2"
        >
          <FileUp className="size-[18px]" aria-hidden="true" />
          {dateien.length > 0 ? "Weitere Datei hochladen" : "Foto oder Datei hochladen"}
          <input
            id={id}
            type="file"
            multiple
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              const neu = Array.from(e.target.files ?? []).map((f) => f.name);
              if (neu.length > 0) onDateien([...dateien, ...neu]);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

/** Auftragsakte aus dem Demo-Stand (Anna 2026-10-20). */
export function AkteAusZustand({ zustand, unterSpannung }: { zustand: DemoZustand; unterSpannung: boolean }) {
  const letzte = (text: string) => [...zustand.verlauf].reverse().find((v) => v.text === text)?.zeit ?? null;
  const abgabe = letzte(VERLAUF.abgeschlossen);
  return (
    <Auftragsakte
      auftrag={{
        titel: DEMO_AUFTRAG.titel,
        ausgabe: DEMO_AUFTRAG.ausgabe,
        frist: DEMO_AUFTRAG.frist,
        trainer: TRAINER_PRAXIS_DEMO.name,
      }}
      auftragDateien={zustand.auftragDateien}
      werkzeuge={zustand.werkzeuge}
      materialien={zustand.materialien}
      schritte={zustand.schritte}
      planDateien={zustand.planDateien}
      pruefungenOhneSpannung={PRUEFLISTE_STANDARD.spannungsfrei.map((p) => ({
        titel: p.titel,
        erledigt: zustand.geprueftSpannungsfrei.includes(p.id),
      }))}
      unterSpannung={unterSpannung}
      pruefungenUnterSpannung={PRUEFLISTE_STANDARD.unterSpannung.map((p) => ({
        titel: p.titel,
        erledigt: zustand.geprueftUnterSpannung.includes(p.id),
      }))}
      protokollDateien={zustand.protokollDateien}
      freigabe={letzte(VERLAUF.freigabe)}
      kriterien={BOGEN}
      einschaetzungen={[
        { name: "Du", werte: zustand.selbst },
        { name: "Peer", werte: zustand.peer },
        { name: "Trainer:in", werte: zustand.fremd },
      ]}
      abgabe={abgabe}
      verspaetet={nachFrist(abgabe ?? undefined, DEMO_AUFTRAG.fristZeitpunkt)}
      verlauf={zustand.verlauf}
    />
  );
}
