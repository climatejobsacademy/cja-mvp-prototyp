"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ClipboardCheck, Hammer, Info, ListOrdered, Package, Search, Star, UserCheck, Wrench } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Einschaetzung, VerifizierungStatus } from "@/components/praxisflow/bewertung";
import { CodewortGate } from "@/components/praxisflow/codewort-gate";
import { DemoLeiste } from "@/components/praxisflow/demo-leiste";
import { FotoVorschau } from "@/components/praxisflow/foto-vorschau";
import { DateienBlock, Hinweis, InstruktionKarte } from "@/components/praxisflow/instruktion-karte";
import { ListenEditor } from "@/components/praxisflow/listen-editor";
import { PhasenAnzeige } from "@/components/praxisflow/phasen-anzeige";
import { PlanUebersicht } from "@/components/praxisflow/plan-uebersicht";
import { SchritteCheckliste } from "@/components/praxisflow/schritte-checkliste";
import { FOKUS, PRIMAER, SEKUNDAER, TEXT } from "@/components/praxisflow/stile";
import {
  BEWERTUNGSKRITERIEN,
  DATEIEN,
  DATEIEN_ORDNER,
  DEMO_AUFTRAG,
  DEMO_CODEWORT,
  PHASEN,
  PHASEN_TEXTE,
  PUNKTE_SKALA,
  SPEICHER_PRAEFIX,
  TEXTE,
  ZEIGE_PRUEFPROTOKOLL_HINWEIS,
  type PhaseId,
} from "@/lib/praxisflow-daten";
import {
  alleErledigt,
  bewertungAbschliessbar,
  codewortKorrekt,
  demoZuruecksetzen,
  eintragBearbeiten,
  eintragHinzufuegen,
  eintragLoeschen,
  eintragVerschieben,
  erledigtBereinigen,
  schrittStatus,
  schrittUmschalten,
  fremdFreigabeMoeglich,
  planBereit,
  startZustand,
  zustandLaden,
  zustandSpeichern,
  type DemoZustand,
  type Eintrag,
} from "@/lib/praxisflow-logik";
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
  const imBrowser = useSyncExternalStore(nichts, () => true, () => false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={zurueck.href}
          className={cn(
            "-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green",
            FOKUS
          )}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> {zurueck.label}
        </Link>
        <PageHeader title={DEMO_AUFTRAG.titel} />
      </div>
      {imBrowser ? <Flow /> : <p className="text-sm text-muted-foreground">Demo wird geladen …</p>}
    </div>
  );
}

type Liste = "werkzeuge" | "materialien" | "schritte";

function Flow() {
  const [zustand, setZustand] = useState<DemoZustand>(() => zustandLaden(speicher(), SPEICHER_PRAEFIX));
  // Erhöht sich beim Zurücksetzen, damit Eingabefelder und Foto neu starten.
  const [durchlauf, setDurchlauf] = useState(0);

  useEffect(() => {
    zustandSpeichern(speicher(), SPEICHER_PRAEFIX, zustand);
  }, [zustand]);

  const aktuell = PHASEN.findIndex((p) => p.id === zustand.phase);
  const texte = PHASEN_TEXTE[zustand.phase];

  function zuPhase(phase: PhaseId) {
    setZustand((z) => ({ ...z, phase, erledigt: erledigtBereinigen(z.erledigt, z.schritte) }));
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
      onHinzufuegen: (text: string) => liste(name, (l) => eintragHinzufuegen(l, text, neueId())),
      onBearbeiten: (id: string, text: string) => liste(name, (l) => eintragBearbeiten(l, id, text)),
      onLoeschen: (id: string) => liste(name, (l) => eintragLoeschen(l, id)),
    };
  }

  function zuruecksetzen() {
    demoZuruecksetzen(speicher(), SPEICHER_PRAEFIX);
    setZustand(startZustand());
    setDurchlauf((d) => d + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const karte = {
    instruktion: texte.instruktion,
    hastDuAlles: texte.hastDuAlles,
    hastDuAllesTitel: TEXTE.hastDuAllesTitel,
  };

  return (
    <>
      <DemoLeiste kennzeichnung={DEMO_AUFTRAG.kennzeichnung} text={DEMO_AUFTRAG.banner} onZuruecksetzen={zuruecksetzen} />
      <PhasenAnzeige phasen={PHASEN} aktuell={aktuell} />

      <div key={`${durchlauf}-${zustand.phase}`} className="flex flex-col gap-6">
        {zustand.phase === "analyse" && (
          <InstruktionKarte icon={Search} titel="Analyse" {...karte}>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-eco-deep-green">Arbeitsauftrag</h3>
              <p className={TEXT}>{TEXTE.analyse.arbeitsauftrag}</p>
            </div>
            <DateienBlock titel="Dateien" ordner={DATEIEN_ORDNER} dateien={DATEIEN} />
            <button type="button" onClick={() => zuPhase("planen")} className={PRIMAER}>
              Weiter zu Planen
              <ArrowRight aria-hidden="true" />
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "planen" && (
          <InstruktionKarte icon={ListOrdered} titel="Planen" {...karte}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListenEditor
                id="werkzeuge"
                titel="Werkzeuge"
                icon={Wrench}
                einzahl="Werkzeug"
                leerText="Noch keine Werkzeuge eingetragen."
                platzhalter="Werkzeug eintragen …"
                {...editorProps("werkzeuge")}
              />
              <ListenEditor
                id="materialien"
                titel="Materialien"
                icon={Package}
                einzahl="Material"
                leerText="Noch keine Materialien eingetragen."
                platzhalter="Material eintragen …"
                {...editorProps("materialien")}
              />
            </div>
            <ListenEditor
              id="schritte"
              titel="Arbeitsschritte"
              icon={ListOrdered}
              einzahl="Schritt"
              leerText="Noch keine Arbeitsschritte eingetragen."
              platzhalter="Arbeitsschritt eintragen …"
              {...editorProps("schritte")}
              onVerschieben={(id, richtung) => liste("schritte", (l) => eintragVerschieben(l, id, richtung))}
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => zuPhase("entscheiden")}
                disabled={!planBereit(zustand.schritte)}
                aria-describedby={planBereit(zustand.schritte) ? undefined : "planen-gesperrt"}
                className={PRIMAER}
              >
                Weiter zu Entscheiden
                <ArrowRight aria-hidden="true" />
              </button>
              {!planBereit(zustand.schritte) && (
                <p id="planen-gesperrt" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Info className="size-4 shrink-0" aria-hidden="true" />
                  {TEXTE.planen.gesperrt}
                </p>
              )}
            </div>
          </InstruktionKarte>
        )}

        {zustand.phase === "entscheiden" && (
          <InstruktionKarte icon={UserCheck} titel="Entscheiden" {...karte}>
            <PlanUebersicht werkzeuge={zustand.werkzeuge} materialien={zustand.materialien} schritte={zustand.schritte} />
            <CodewortGate
              id="gate-entscheiden"
              hinweis={TEXTE.gates.entscheiden}
              label={TEXTE.codewort.label}
              buttonText="Plan freigeben"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => zuPhase("durchfuehren")}
            />
          </InstruktionKarte>
        )}

        {zustand.phase === "durchfuehren" && (
          <InstruktionKarte icon={Hammer} titel="Durchführen" {...karte}>
            {/* "Ich komme nicht weiter" vorerst ausgeblendet, siehe schritte-checkliste.tsx */}
            <SchritteCheckliste
              schritte={zustand.schritte}
              erledigt={zustand.erledigt}
              status={Object.fromEntries(zustand.schritte.map((s) => [s.id, schrittStatus(zustand.schritte, zustand.erledigt, s.id)]))}
              gesperrtHinweis={TEXTE.durchfuehren.gesperrt}
              onUmschalten={(id) => setZustand((z) => ({ ...z, erledigt: schrittUmschalten(z.schritte, z.erledigt, id) }))}
            />
            <CodewortGate
              id="gate-durchfuehren"
              hinweis={TEXTE.gates.durchfuehren}
              label={TEXTE.codewort.label}
              buttonText="Durchführung freigeben"
              aktiv={alleErledigt(zustand.schritte, zustand.erledigt)}
              gesperrtText={TEXTE.codewort.gesperrtDurchfuehren}
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => zuPhase("kontrolle")}
            />
            <button type="button" onClick={() => zuPhase("planen")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Planen
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "kontrolle" && (
          <InstruktionKarte icon={ClipboardCheck} titel="Kontrolle" {...karte}>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-eco-deep-green">Dokumentation</h3>
              <p className={TEXT}>{TEXTE.kontrolle.dokumentation}</p>
            </div>
            {ZEIGE_PRUEFPROTOKOLL_HINWEIS && <Hinweis icon={ClipboardCheck}>{TEXTE.kontrolle.hinweisProtokoll}</Hinweis>}
            <FotoVorschau />
            <CodewortGate
              id="gate-kontrolle"
              hinweis={TEXTE.gates.kontrolle}
              label={TEXTE.codewort.label}
              buttonText="Kontrolle freigeben"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => zuPhase("bewerten")}
            />
            <button type="button" onClick={() => zuPhase("durchfuehren")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Durchführen
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "bewerten" && (
          <InstruktionKarte icon={Star} titel="Bewerten" {...karte}>
            <Einschaetzung
              id="selbst"
              titel={TEXTE.bewerten.selbstTitel}
              text={TEXTE.bewerten.selbstText}
              kriterien={BEWERTUNGSKRITERIEN}
              skala={PUNKTE_SKALA}
              werte={zustand.selbst}
              onWert={(k, p) => setZustand((z) => ({ ...z, selbst: { ...z.selbst, [k]: p } }))}
              gesperrt={zustand.fremdFreigegeben}
            />
            {!zustand.fremdFreigegeben && (
              <CodewortGate
                id="gate-bewerten"
                hinweis={TEXTE.gates.bewerten}
                label={TEXTE.codewort.label}
                buttonText="Fremdeinschätzung freischalten"
                aktiv={fremdFreigabeMoeglich(BEWERTUNGSKRITERIEN, zustand.selbst, PUNKTE_SKALA)}
                gesperrtText={TEXTE.codewort.gesperrtBewerten}
                fehlerText={TEXTE.codewort.falsch}
                pruefen={pruefen}
                onFreigabe={() => setZustand((z) => ({ ...z, fremdFreigegeben: true }))}
              />
            )}
            <Einschaetzung
              id="fremd"
              titel={TEXTE.bewerten.fremdTitel}
              text={TEXTE.bewerten.fremdText}
              kriterien={BEWERTUNGSKRITERIEN}
              skala={PUNKTE_SKALA}
              werte={zustand.fremd}
              onWert={(k, p) => setZustand((z) => ({ ...z, fremd: { ...z.fremd, [k]: p } }))}
              gesperrt={!zustand.fremdFreigegeben || zustand.bewertungAbgeschlossen}
            />
            {zustand.bewertungAbgeschlossen ? (
              <VerifizierungStatus label={TEXTE.bewerten.status} text={TEXTE.bewerten.statusText} />
            ) : (
              <button
                type="button"
                onClick={() => setZustand((z) => ({ ...z, bewertungAbgeschlossen: true }))}
                disabled={!bewertungAbschliessbar(zustand, BEWERTUNGSKRITERIEN, PUNKTE_SKALA)}
                className={PRIMAER}
              >
                Bewertung abschließen
              </button>
            )}
          </InstruktionKarte>
        )}
      </div>
    </>
  );
}
