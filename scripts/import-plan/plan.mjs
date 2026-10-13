// scripts/import-plan/plan.mjs
// Wandelt die Importvorlage (Excel von Content & Learning, Tabs Module,
// Kompetenzen, Teilschritte, Aufträge, Stundenplan, Trainer) in einen
// Importplan (JSON) um, den import.sql in die Datenbank schreibt. Reine
// Funktion ohne Datenbank und ohne Uhr; getestet in plan.test.mjs.
// Anleitung: docs/import-plan.md.
//
// Regeln (Entscheidungen 2026-10-13):
// - Typ-Regel SR-71: theoretische Teilschritte nur an Lektionen (über den
//   Theorietag), praktische nur an Aufträge (Field-Job-Typen). Alles andere
//   wird gemeldet und nicht importiert.
// - Eine Trainer:in je Termin: bei "Simon, Tom" die erste.
// - Zeilen ohne Datum werden übersprungen und gemeldet; Spalte "Offen",
//   SCORM, PDFs und Zoom-Links werden nicht gelesen.
// - Aufträge eines Praxisblocks ohne Tagesbindung werden der Reihe nach auf
//   die Blocktage verteilt (Vorschlag, ganztägig ohne Uhrzeit).

const ROEMISCH = { I: 1, II: 2, III: 3, IV: 4, V: 5, Abschluss: 6 };

/**
 * Modul I: Theorietage M01-T01–T11 sind die Foliensätze 01–11 der schon
 * importierten Wochen 1–2. Zuordnung zu den bestehenden Live-Lektionen über
 * lesson.thema. Abgeleitet aus den bestehenden Lektion-Teilschritt-
 * Zuordnungen auf Staging (13.10.2026); T03, T04 und T11 bestätigt Malte
 * (docs/import-plan.md, offene Fragen).
 */
export const FOLIENSAETZE_MODUL_I = {
  "M01-T01": ["Grundeinheiten U, R, I, P, W, Schaltungen"],
  "M01-T02": ["Schaltungen, Einführung Elektrischer Bauteile"],
  "M01-T03": ["Schaltungen, Einführung Elektrischer Bauteile"],
  "M01-T04": ["Der elektrische Widerstand"],
  "M01-T05": ["Der Kondensator"],
  "M01-T06": ["Die Spule"],
  "M01-T07": ["Der Transistor / Die Dioden"],
  "M01-T08": ["Der Transistor / Die Dioden"],
  "M01-T09": ["Verschaltungen der Bauelemente zu Baugruppen"],
  "M01-T10": ["Löttechnik, Platine, Jumper"],
  "M01-T11": ["Umgang mit Multimeter, Analog vs Digital"],
};

const BEGLEITKURSE = ["Deutsch/Fachdeutsch", "Softskills Coaching"];

const liste = (wert) =>
  (wert ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const zahl = (wert) => (wert === "" || wert == null ? null : Math.round(Number(wert)));

/** "19.10.2026" -> "2026-10-19", sonst null */
export function datumIso(wert) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec((wert ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "08:00" -> "08:00", sonst null */
function uhrzeit(wert) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((wert ?? "").trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

function pflicht(tabs, name) {
  const tab = tabs[name];
  if (!tab) throw new Error(`Tab "${name}" fehlt in der Datei.`);
  return tab;
}

/** Theorietag "T05" im Modul II -> "M02-T05"; "M01-T04" bleibt. */
function theorietagKennung(modul, wert) {
  if (/^M\d{2}-T\d{2}$/.test(wert)) return wert;
  if (/^T\d{2}$/.test(wert)) return `M${String(ROEMISCH[modul]).padStart(2, "0")}-${wert}`;
  return null;
}

/**
 * @param {Record<string, Record<string,string>[]>} tabs  Ergebnis von leseXlsx
 * @param {{ module?: string[] }} optionen  Module im Umfang (Standard: I, II)
 */
export function erstellePlan(tabs, optionen = {}) {
  const umfang = new Set(optionen.module ?? ["I", "II"]);
  const meldungen = [];
  const melde = (art, text) => meldungen.push({ art, text });

  // ---------- Module ----------
  const moduleImUmfang = pflicht(tabs, "Module")
    .filter((z) => umfang.has(z["Modul"]))
    .map((z) => ({ modul: z["Modul"], reihenfolge: ROEMISCH[z["Modul"]], titel: z["Titel"] }));
  for (const m of umfang) {
    if (!moduleImUmfang.some((x) => x.modul === m)) throw new Error(`Modul ${m} fehlt im Tab Module.`);
  }

  // ---------- Trainer ----------
  const trainerTab = pflicht(tabs, "Trainer");
  const trainerNachName = new Map(trainerTab.map((z) => [z["Anzeigename"], z["Kennung"]]));
  const trainerBenutzt = new Set();

  // ---------- Kompetenzen ----------
  const kompetenzen = pflicht(tabs, "Kompetenzen")
    .filter((z) => umfang.has(z["Modul"]))
    .map((z) => ({
      kennung: z["Kürzel"],
      bisher: z["Bisheriges Kürzel"] || null,
      modul: z["Modul"],
      name: z["Kurztitel"],
      reihenfolge: zahl(z["Reihenfolge im Modul"]),
    }));
  const kompetenzKennungen = new Set(kompetenzen.map((k) => k.kennung));

  // ---------- Teilschritte ----------
  const teilschritte = pflicht(tabs, "Teilschritte")
    .filter((z) => umfang.has(z["Modul"]))
    .map((z) => ({
      kennung: z["Kennung"],
      kompetenz: z["Kompetenz-Kürzel"],
      modul: z["Modul"],
      reihenfolge: zahl(z["Reihenfolge in Kompetenz"]),
      name: z["Titel"],
      typ: z["Typ"],
      theorietage: liste(z["Theorietag"]).map((t) => theorietagKennung(z["Modul"], t) ?? t),
      auftraege: liste(z["Aufträge"]),
    }));
  for (const s of teilschritte) {
    if (!kompetenzKennungen.has(s.kompetenz)) throw new Error(`${s.kennung}: Kompetenz ${s.kompetenz} fehlt im Tab Kompetenzen.`);
    if (s.typ !== "theoretisch" && s.typ !== "praktisch") throw new Error(`${s.kennung}: Typ "${s.typ}" ist weder theoretisch noch praktisch.`);
    if (!s.reihenfolge) throw new Error(`${s.kennung}: Reihenfolge fehlt.`);
  }

  // ---------- Stundenplan ----------
  const termineRoh = [];
  const ausserhalb = new Map();
  for (const z of pflicht(tabs, "Stundenplan")) {
    if (!umfang.has(z["Modul"])) {
      ausserhalb.set(z["Modul"], (ausserhalb.get(z["Modul"]) ?? 0) + 1);
      continue;
    }
    const datum = datumIso(z["Datum"]);
    if (!datum) {
      melde("ohne-datum", `${z["Kennung"]} übersprungen: kein gültiges Datum.`);
      continue;
    }
    const trainerName = liste(z["Trainer:in"])[0] ?? null;
    let trainer = null;
    if (trainerName) {
      trainer = trainerNachName.get(trainerName) ?? null;
      if (!trainer) melde("trainer", `${z["Kennung"]}: Trainer:in nicht im Tab Trainer, Termin ohne Trainer:in.`);
      else trainerBenutzt.add(trainer);
    }
    termineRoh.push({
      kennung: z["Kennung"],
      datum,
      modul: z["Modul"],
      woche: zahl(z["Woche im Modul"]),
      art: z["Theorie/Praxis"],
      lage: z["online/Präsenz"],
      start: uhrzeit(z["von"]),
      ende: uhrzeit(z["bis"]),
      kurstitel: z["Kurstitel"],
      thema: z["Thema"] || null,
      theorietage: liste(z["Theorietag"]).map((t) => theorietagKennung(z["Modul"], t) ?? t),
      auftraege: liste(z["Auftragsnummer"]),
      ort: z["Ort"] && z["Ort"] !== "online" ? z["Ort"] : null,
      trainer,
    });
  }
  for (const [modul, anzahl] of ausserhalb) {
    melde("ausser-umfang", `Modul ${modul}: ${anzahl} Termine nicht im Umfang dieses Laufs.`);
  }

  // ---------- Wochen ----------
  const wochenMap = new Map();
  for (const t of termineRoh) {
    const schluessel = `${t.modul}|${t.woche}`;
    const w = wochenMap.get(schluessel) ?? { modul: t.modul, nummer: t.woche, arten: new Set(), lagen: new Set() };
    if (t.art === "Theorie" && !BEGLEITKURSE.includes(t.kurstitel)) w.arten.add("theorie");
    if (t.art === "Praxis") w.arten.add("praxis");
    if (t.art === "Theorie" || t.art === "Praxis") w.lagen.add(t.lage === "online" ? "online" : "praesenz");
    wochenMap.set(schluessel, w);
  }
  const wochen = [...wochenMap.values()]
    .map((w) => {
      if (w.arten.size !== 1) throw new Error(`Modul ${w.modul}, Woche ${w.nummer}: Wochentyp nicht eindeutig (${[...w.arten].join(", ") || "keiner"}).`);
      if (w.lagen.size !== 1) throw new Error(`Modul ${w.modul}, Woche ${w.nummer}: Lage nicht eindeutig.`);
      return { modul: w.modul, nummer: w.nummer, wochentyp: [...w.arten][0], lage: [...w.lagen][0] };
    })
    .sort((a, b) => ROEMISCH[a.modul] - ROEMISCH[b.modul] || a.nummer - b.nummer);

  // ---------- Kurse (Theorietage mit Live- und Selbstlern-Lektion) ----------
  // Muster der Wochen 1-2: je Theorietag ein Kurs "Kurstitel (Thema)" mit
  // Live-Lektion (Reihenfolge 1) und Selbstlern-Lektion (Reihenfolge 2, SCORM
  // folgt). Gleicher Kurstitel und gleiches Thema mehrfach im Modul -> "– Teil n".
  const kursTermine = termineRoh.filter((t) => t.art === "Theorie" && !BEGLEITKURSE.includes(t.kurstitel));
  const gleiche = new Map();
  for (const t of kursTermine) {
    const k = `${t.modul}|${t.kurstitel}|${t.thema ?? ""}`;
    gleiche.set(k, [...(gleiche.get(k) ?? []), t]);
  }
  const kurse = [];
  kursTermine.forEach((t) => {
    const gruppe = gleiche.get(`${t.modul}|${t.kurstitel}|${t.thema ?? ""}`);
    const teil = gruppe.length > 1 ? ` – Teil ${gruppe.indexOf(t) + 1}` : "";
    const name = (t.thema ? `${t.kurstitel} (${t.thema})` : t.kurstitel) + teil;
    const kurs = {
      schluessel: `${t.modul}|${name}`,
      modul: t.modul,
      woche: t.woche,
      name,
      lektion: t.kurstitel + teil,
      thema: t.thema,
      reihenfolge: ROEMISCH[t.modul] * 100 + kurse.filter((k) => k.modul === t.modul).length + 1,
      theorietage: t.theorietage,
    };
    kurse.push(kurs);
    t.kurs = kurs.schluessel;
    if (!t.thema) melde("kurs", `${t.kennung}: kein Thema, Lektion ohne Thema angelegt.`);
  });

  // ---------- Aufträge ----------
  const auftraegeTab = pflicht(tabs, "Aufträge").filter((z) => umfang.has(z["Modul"]));
  const ersteWoche = new Map();
  for (const t of termineRoh.filter((x) => x.art === "Praxis")) {
    for (const a of t.auftraege) if (!ersteWoche.has(a)) ersteWoche.set(a, { modul: t.modul, woche: t.woche });
  }
  const zaehlerJeModul = new Map();
  const auftraege = auftraegeTab.map((z) => {
    const kennung = z["Nummer"];
    const nr = (zaehlerJeModul.get(z["Modul"]) ?? 0) + 1;
    zaehlerJeModul.set(z["Modul"], nr);
    const woche = ersteWoche.get(kennung);
    if (!woche) melde("auftrag", `${kennung}: in keinem Termin dieses Laufs, Woche bleibt wie in der Datenbank.`);
    // Modul I: Reihenfolge = Auftragsnummer (bestehende Typen 1-5); sonst Modul*100 + Position im Tab
    const reihenfolge = z["Modul"] === "I" ? Number(kennung.slice(-2)) : ROEMISCH[z["Modul"]] * 100 + nr;
    return {
      kennung,
      titel: z["Titel"],
      modul: z["Modul"],
      woche: woche?.woche ?? null,
      reihenfolge,
      sichtbar: (z["In Plattform zeigen (ja/nein)"] || "ja").toLowerCase() !== "nein",
      teilschritte: liste(z["Teilschritte (Kennungen)"]),
    };
  });
  const auftragKennungen = new Set(auftraege.map((a) => a.kennung));

  // Abgleich Tab Teilschritte <-> Tab Aufträge (führend: Teilschritte)
  for (const a of auftraege) {
    const ausSchritten = teilschritte.filter((s) => s.auftraege.includes(a.kennung)).map((s) => s.kennung);
    const nurAuftrag = a.teilschritte.filter((k) => !ausSchritten.includes(k));
    const nurSchritt = ausSchritten.filter((k) => !a.teilschritte.includes(k));
    if (nurAuftrag.length || nurSchritt.length) {
      melde(
        "abgleich",
        `${a.kennung}: Tabs weichen ab (nur in Aufträge: ${nurAuftrag.join(", ") || "–"}; nur in Teilschritte: ${nurSchritt.join(", ") || "–"}). Führend ist Tab Teilschritte.`
      );
    }
  }

  // ---------- Zuordnungen und Typ-Regel (SR-71) ----------
  const kurseJeTheorietag = new Map();
  for (const k of kurse) for (const t of k.theorietage) kurseJeTheorietag.set(t, [...(kurseJeTheorietag.get(t) ?? []), k.schluessel]);

  const lektionZuordnungen = [];
  const auftragZuordnungen = [];
  const typregel = { theoretischAnAuftrag: [], praktischAnTheorietag: [] };
  const ohneZuordnung = [];

  for (const s of teilschritte) {
    let anzahl = 0;
    if (s.typ === "theoretisch") {
      for (const t of s.theorietage) {
        if (s.modul === "I") {
          const themen = FOLIENSAETZE_MODUL_I[t];
          if (!themen) {
            melde("theorietag", `${s.kennung}: Theorietag ${t} unbekannt, nicht zugeordnet.`);
            continue;
          }
          lektionZuordnungen.push({ teilschritt: s.kennung, foliensatz: t, themen });
          anzahl++;
        } else {
          const kurseZuT = kurseJeTheorietag.get(t) ?? [];
          if (!kurseZuT.length) melde("theorietag", `${s.kennung}: Theorietag ${t} hat keinen Termin mit Datum, nicht zugeordnet.`);
          for (const kurs of kurseZuT) {
            lektionZuordnungen.push({ teilschritt: s.kennung, kurs });
            anzahl++;
          }
        }
      }
      for (const a of s.auftraege) typregel.theoretischAnAuftrag.push({ teilschritt: s.kennung, auftrag: a });
    } else {
      for (const a of s.auftraege) {
        if (!auftragKennungen.has(a)) {
          melde("auftrag", `${s.kennung}: Auftrag ${a} fehlt im Tab Aufträge, nicht zugeordnet.`);
          continue;
        }
        auftragZuordnungen.push({ teilschritt: s.kennung, auftrag: a });
        anzahl++;
      }
      for (const t of s.theorietage) typregel.praktischAnTheorietag.push({ teilschritt: s.kennung, theorietag: t });
    }
    if (anzahl === 0) ohneZuordnung.push({ teilschritt: s.kennung, typ: s.typ, theorietage: s.theorietage, auftraege: s.auftraege });
  }

  // ---------- Termine (je Kohorte in import.sql) ----------
  const begleitkurse = [];
  const termine = [];
  const praxisTermine = termineRoh.filter((t) => t.art === "Praxis" && t.auftraege.length > 0);

  // Praxisblöcke: aufeinanderfolgende Termine mit derselben Liste mehrerer Aufträge
  const bloecke = [];
  for (const t of praxisTermine.filter((x) => x.auftraege.length > 1)) {
    const letzter = bloecke.at(-1);
    if (letzter && letzter.schluessel === t.auftraege.join(",")) letzter.termine.push(t);
    else bloecke.push({ schluessel: t.auftraege.join(","), termine: [t] });
  }
  const verteilung = new Map();
  for (const b of bloecke) {
    const auftr = b.termine[0].auftraege;
    const tage = b.termine.length;
    auftr.forEach((a, i) => {
      const t = b.termine[Math.floor((i * tage) / auftr.length)];
      verteilung.set(t.kennung, [...(verteilung.get(t.kennung) ?? []), a]);
    });
    melde(
      "praxisblock",
      `Block ${b.termine[0].kennung}–${b.termine.at(-1).kennung}: ${auftr.length} Aufträge ohne Tagesbindung auf ${tage} Tage verteilt (Vorschlag, ganztägig): ` +
        b.termine.map((t) => `${t.datum.slice(8)}.${t.datum.slice(5, 7)}. ${(verteilung.get(t.kennung) ?? []).join("+") || "–"}`).join("; ")
    );
  }

  for (const t of termineRoh) {
    const basis = { kennung: t.kennung, datum: t.datum, start: t.start, ende: t.ende, trainer: t.trainer };
    if (t.kurs) {
      termine.push({ ...basis, art: "kurs", kurs: t.kurs });
    } else if (BEGLEITKURSE.includes(t.kurstitel) || t.art === "Coaching") {
      if (!begleitkurse.includes(t.kurstitel)) begleitkurse.push(t.kurstitel);
      if (!t.start || !t.ende) {
        melde("ohne-zeit", `${t.kennung} übersprungen: Uhrzeit fehlt.`);
        continue;
      }
      termine.push({ ...basis, art: "begleit", begleitkurs: t.kurstitel });
    } else if (t.art === "Praxis") {
      if (!t.auftraege.length) {
        melde("praxis", `${t.kennung} übersprungen: keine Auftragsnummer.`);
        continue;
      }
      const verteilt = verteilung.get(t.kennung);
      if (t.auftraege.length > 1) {
        if (!verteilt) continue;
        termine.push({ ...basis, start: null, ende: null, art: "praxis", auftraege: verteilt, ort: t.ort });
      } else {
        termine.push({ ...basis, art: "praxis", auftraege: t.auftraege, ort: t.ort });
      }
    } else {
      melde("termintyp", `${t.kennung} übersprungen: Termintyp "${t.art}" wird in diesem Lauf nicht importiert.`);
    }
  }
  for (const t of termine) {
    for (const a of t.auftraege ?? []) {
      if (!auftragKennungen.has(a)) throw new Error(`${t.kennung}: Auftrag ${a} fehlt im Tab Aufträge.`);
    }
  }

  const trainer = trainerTab
    .filter((z) => trainerBenutzt.has(z["Kennung"]))
    .map((z) => ({ kennung: z["Kennung"], anzeigename: z["Anzeigename"] }));

  return {
    module: moduleImUmfang,
    wochen,
    trainer,
    kompetenzen,
    teilschritte: teilschritte.map(({ kennung, kompetenz, modul, reihenfolge, name, typ }) => ({ kennung, kompetenz, modul, reihenfolge, name, typ })),
    auftraege: auftraege.map(({ kennung, titel, modul, woche, reihenfolge, sichtbar }) => ({ kennung, titel, modul, woche, reihenfolge, sichtbar })),
    kurse: kurse.map(({ schluessel, modul, woche, name, lektion, thema, reihenfolge }) => ({ schluessel, modul, woche, name, lektion, thema, reihenfolge })),
    begleitkurse,
    lektionZuordnungen,
    auftragZuordnungen,
    termine,
    analyse: { typregel, ohneZuordnung },
    meldungen,
  };
}
