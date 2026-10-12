"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Hammer,
  Info,
  ListOrdered,
  Package,
  Search,
  Star,
  UserCheck,
  Wrench,
} from "lucide-react";

import { Einschaetzung } from "@/components/praxisflow/bewertung";
import { CodewortGate } from "@/components/praxisflow/codewort-gate";
import { DemoLeiste } from "@/components/praxisflow/demo-leiste";
import { FotoVorschau } from "@/components/praxisflow/foto-vorschau";
import { Einblenden } from "@/components/praxisflow/einblenden";
import { DateienBlock, Hinweis, InstruktionKarte } from "@/components/praxisflow/instruktion-karte";
import { ListenEditor } from "@/components/praxisflow/listen-editor";
import { PhasenAnzeige } from "@/components/praxisflow/phasen-anzeige";
import { PlanUebersicht } from "@/components/praxisflow/plan-uebersicht";
import {
  AufgabeGeschafft,
  BewertungVergleich,
  EtappeGeschafft,
  FokusDurchfuehren,
} from "@/components/praxisflow/spiel-elemente";
import { FOKUS, PRIMAER, SEKUNDAER, TEXT, UEBERSCHRIFT } from "@/components/praxisflow/stile";
import {
  ABSCHLUSS_KOMPETENZEN,
  BEWERTUNGSKRITERIEN,
  DATEIEN,
  DATEIEN_ORDNER,
  DEMO_AUFTRAG,
  DEMO_CODEWORT,
  ETAPPEN_TEXTE,
  NOTEN_BESCHREIBUNGEN,
  PHASEN,
  PHASEN_TEXTE,
  PLANEN_UNTERSCHRITTE,
  PUNKTE_SKALA,
  SPEICHER_PRAEFIX,
  TEXTE,
  ZEIGE_CHECKLISTE,
  ZEIGE_INSTRUKTION,
  ZEIGE_PRUEFPROTOKOLL_HINWEIS,
  type PhaseId,
} from "@/lib/praxisflow-daten";
import {
  alleErledigt,
  bewertungAbschliessbar,
  codewortKorrekt,
  demoZuruecksetzen,
  eintragBearbeiten,
  eintragLoeschen,
  eintraegeAnhaengen,
  eintragVerschieben,
  erledigtBereinigen,
  schrittStatus,
  schrittUmschalten,
  fremdFreigabeMoeglich,
  planBereit,
  planenWeiter,
  planenWeiterMoeglich,
  planenZurueck,
  startZustand,
  zustandLaden,
  zustandSpeichern,
  type DemoZustand,
  type Eintrag,
} from "@/lib/praxisflow-logik";
import { FachText } from "@/components/sprachtraining/fach-text";
import { Avatar } from "@/components/avatar";
import { TRAINER_PRAXIS_DEMO } from "@/lib/demo-personen";
import { cn } from "@/lib/utils";

function speicher(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function neueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const pruefen = (eingabe: string) => codewortKorrekt(eingabe, DEMO_CODEWORT);
const nichts = () => () => {};

type Zurueck = { href: string; label: string };

/**
 * Rendert den Flow erst im Browser: der Stand liegt im localStorage, der
 * Server kennt ihn nicht. So gibt es keinen Hydration-Unterschied.
 */
export function PraxisflowDemo({ zurueck }: { zurueck: Zurueck }) {
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
      {imBrowser ? <Flow /> : <p className="text-sm text-ink-muted">Demo wird geladen …</p>}
    </div>
  );
}

type Liste = "werkzeuge" | "materialien" | "schritte";

const PHASEN_SYMBOL: Record<PhaseId, typeof Wrench> = {
  analyse: Search,
  planen: ListOrdered,
  entscheiden: UserCheck,
  durchfuehren: Hammer,
  kontrolle: ClipboardCheck,
  bewerten: Star,
};

const EDITOR: Record<Liste, { icon: typeof Wrench; einzahl: string; leerText: string; platzhalter: string }> = {
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

function Flow() {
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
          <InstruktionKarte icon={Search} titel="Analyse" {...karte}>
            <AnalyseSchritte onWeiter={() => geschafft("planen")} />
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
            onWeiter={() => planenGehen("weiter")}
            onZurueck={() => planenGehen("zurueck")}
          />
        )}

        {!etappe && zustand.phase === "entscheiden" && (
          <InstruktionKarte icon={UserCheck} titel="Entscheiden" {...karte}>
            <PlanUebersicht
              werkzeuge={zustand.werkzeuge}
              materialien={zustand.materialien}
              schritte={zustand.schritte}
            />
            <CodewortGate
              id="gate-entscheiden"
              hinweis={TEXTE.gates.entscheiden}
              label={TEXTE.codewort.label}
              buttonText="Plan freigeben"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => geschafft("durchfuehren")}
            />
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "durchfuehren" && (
          <InstruktionKarte icon={Hammer} titel="Durchführen" {...karte}>
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
                <CodewortGate
                  id="gate-durchfuehren"
                  hinweis={TEXTE.gates.durchfuehren}
                  label={TEXTE.codewort.label}
                  buttonText="Durchführung freigeben"
                  aktiv={alleErledigt(zustand.schritte, zustand.erledigt)}
                  gesperrtText={TEXTE.codewort.gesperrtDurchfuehren}
                  fehlerText={TEXTE.codewort.falsch}
                  pruefen={pruefen}
                  onFreigabe={() => geschafft("kontrolle")}
                />
              </Einblenden>
            )}
            <button type="button" onClick={() => zuPhase("planen")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Planen
            </button>
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "kontrolle" && (
          <InstruktionKarte icon={ClipboardCheck} titel="Kontrolle" {...karte}>
            <div className="flex flex-col gap-1.5">
              <h3 className={UEBERSCHRIFT}>Dokumentation</h3>
              <p className={TEXT}>{TEXTE.kontrolle.dokumentation}</p>
            </div>
            {ZEIGE_PRUEFPROTOKOLL_HINWEIS && (
              <Hinweis icon={ClipboardCheck}>{TEXTE.kontrolle.hinweisProtokoll}</Hinweis>
            )}
            <FotoVorschau />
            <CodewortGate
              id="gate-kontrolle"
              hinweis={TEXTE.gates.kontrolle}
              label={TEXTE.codewort.label}
              buttonText="Kontrolle freigeben"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => geschafft("bewerten")}
            />
            <button type="button" onClick={() => zuPhase("durchfuehren")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Durchführen
            </button>
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "bewerten" && zustand.bewertungAbgeschlossen && (
          <InstruktionKarte
            icon={Star}
            titel="Geschafft"
            {...karte}
            instruktion={undefined}
            hastDuAlles={[]}
            fortschritt={<PhasenAnzeige phasen={PHASEN} aktuell={PHASEN.length} />}
          >
            <AufgabeGeschafft kompetenzen={ABSCHLUSS_KOMPETENZEN} />
          </InstruktionKarte>
        )}

        {!etappe && zustand.phase === "bewerten" && !zustand.bewertungAbgeschlossen && (
          <InstruktionKarte icon={Star} titel="Bewerten" {...karte}>
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

/**
 * Bewerten eins nach dem anderen (Anna 2026-10-12): Selbsteinschätzung →
 * Freigabe per Codewort → Fremdeinschätzung → Vergleich und Abschluss.
 * Erledigte Schritte klappen zu einer Zeile mit Häkchen zusammen. Regeln
 * und gespeicherter Stand wie bisher (praxisflow-logik.ts).
 */
function BewertenSchritte({
  zustand,
  setZustand,
}: {
  zustand: DemoZustand;
  setZustand: React.Dispatch<React.SetStateAction<DemoZustand>>;
}) {
  const selbstKomplett = fremdFreigabeMoeglich(BEWERTUNGSKRITERIEN, zustand.selbst, PUNKTE_SKALA);
  const fremdKomplett = fremdFreigabeMoeglich(BEWERTUNGSKRITERIEN, zustand.fremd, PUNKTE_SKALA);
  const [selbstFertig, setSelbstFertig] = useState(zustand.fremdFreigegeben);
  const [fremdFertig, setFremdFertig] = useState(zustand.fremdFreigegeben && fremdKomplett);

  if (!selbstFertig) {
    return (
      <>
        <Einschaetzung
          id="selbst"
          titel={TEXTE.bewerten.selbstTitel}
          text={TEXTE.bewerten.selbstText}
          kriterien={BEWERTUNGSKRITERIEN}
          skala={PUNKTE_SKALA}
          beschreibungen={NOTEN_BESCHREIBUNGEN}
          werte={zustand.selbst}
          onWert={(k, p) => setZustand((z) => ({ ...z, selbst: { ...z.selbst, [k]: p } }))}
          gesperrt={zustand.fremdFreigegeben}
        />
        {selbstKomplett ? (
          <Einblenden>
            <button type="button" onClick={() => setSelbstFertig(true)} className={cn(PRIMAER, "sm:self-start")}>
              Weiter <ArrowRight aria-hidden="true" />
            </button>
          </Einblenden>
        ) : (
          <p className="text-[13px] text-ink-muted">{TEXTE.codewort.gesperrtBewerten}</p>
        )}
      </>
    );
  }

  const selbstZeile = (
    <ErledigtZeile
      text={TEXTE.bewerten.selbstTitel}
      onAendern={zustand.fremdFreigegeben ? undefined : () => setSelbstFertig(false)}
    />
  );

  if (!zustand.fremdFreigegeben) {
    return (
      <>
        {selbstZeile}
        <Einblenden>
          <CodewortGate
            id="gate-bewerten"
            hinweis={TEXTE.gates.bewerten}
            label={TEXTE.codewort.label}
            buttonText="Fremdeinschätzung freischalten"
            fehlerText={TEXTE.codewort.falsch}
            pruefen={pruefen}
            onFreigabe={() => setZustand((z) => ({ ...z, fremdFreigegeben: true }))}
          />
        </Einblenden>
      </>
    );
  }

  if (!fremdFertig) {
    return (
      <>
        {selbstZeile}
        <Einblenden>
          <Einschaetzung
            id="fremd"
            titel={TEXTE.bewerten.fremdTitel}
            text={TEXTE.bewerten.fremdText}
            kriterien={BEWERTUNGSKRITERIEN}
            skala={PUNKTE_SKALA}
            beschreibungen={NOTEN_BESCHREIBUNGEN}
            werte={zustand.fremd}
            onWert={(k, p) => setZustand((z) => ({ ...z, fremd: { ...z.fremd, [k]: p } }))}
            gesperrt={zustand.bewertungAbgeschlossen}
          />
          {fremdKomplett && (
            <button type="button" onClick={() => setFremdFertig(true)} className={cn(PRIMAER, "sm:self-start")}>
              Weiter zum Vergleich <ArrowRight aria-hidden="true" />
            </button>
          )}
        </Einblenden>
      </>
    );
  }

  return (
    <>
      {selbstZeile}
      <ErledigtZeile text={TEXTE.bewerten.fremdTitel} onAendern={() => setFremdFertig(false)} />
      <BewertungVergleich kriterien={BEWERTUNGSKRITERIEN} selbst={zustand.selbst} fremd={zustand.fremd} />
      <Einblenden>
        <button
          type="button"
          onClick={() => setZustand((z) => ({ ...z, bewertungAbgeschlossen: true }))}
          disabled={!bewertungAbschliessbar(zustand, BEWERTUNGSKRITERIEN, PUNKTE_SKALA)}
          className={cn(PRIMAER, "sm:self-start")}
        >
          Bewertung abschließen <Check aria-hidden="true" />
        </button>
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
function AnalyseSchritte({ onWeiter }: { onWeiter: () => void }) {
  const [gelesen, setGelesen] = useState(false);
  const [angesehen, setAngesehen] = useState<Set<string>>(new Set());
  const alleAngesehen = DATEIEN.every((d) => angesehen.has(d.dateiname));
  return (
    <>
      <div className="flex flex-col gap-3">
        <h3 className={UEBERSCHRIFT}>Arbeitsauftrag</h3>
        {/* Fachbegriffe zum Antippen (SR-24, Sprachtraining-Demo, nur demo) */}
        <p className={TEXT}>
          <FachText text={TEXTE.analyse.arbeitsauftrag} />
        </p>
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
  onWeiter,
  onZurueck,
}: {
  karte: Karte;
  nr: number;
  schritte: Eintrag[];
  editor: (name: Liste) => React.ReactNode;
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
